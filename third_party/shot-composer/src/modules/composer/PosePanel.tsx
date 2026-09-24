import { useEffect, useMemo, useState } from "react";
import { useComposerStore, type SceneObject } from "../../stores/composerStore";
import JointControls from "./JointControls";
import { JOINT_CONFIGS, getDOF, setDOF } from "./helpers/jointConfig";
import { mirrorJoint, sideOf } from "./helpers/mirror";
import {
  deleteCustomPose,
  loadPoseLibrary,
  saveCustomPose,
  updatePose,
  type PoseEntry,
} from "./helpers/poseLibrary";
import { readPosture } from "./helpers/posture";
import "./PosePanel.css";

const JOINT_LABELS: Record<string, string> = {
  Body: "身体", Torso: "躯干", Head: "头部",
  "Left Arm": "左臂", "Right Arm": "右臂", "Left Elbow": "左肘", "Right Elbow": "右肘",
  "Left Wrist": "左手腕", "Right Wrist": "右手腕", "Left Leg": "左腿", "Right Leg": "右腿",
  "Left Knee": "左膝", "Right Knee": "右膝", "Left Ankle": "左脚踝", "Right Ankle": "右脚踝",
};

function zhJointLabel(label: string): string {
  const finger = label.match(/^(Left|Right) (Thumb|Index|Middle|Ring|Little)$/);
  if (finger) {
    const sides: Record<string, string> = { Left: "左", Right: "右" };
    const fingers: Record<string, string> = { Thumb: "拇指", Index: "食指", Middle: "中指", Ring: "无名指", Little: "小指" };
    return `${sides[finger[1]]}${fingers[finger[2]]}`;
  }
  return JOINT_LABELS[label] ?? label;
}

const POSE_LABELS: Record<string, string> = {
  "running with right hand forward": "跑步（右手向前）",
  sitting: "坐姿",
  "sitting copy": "坐姿副本",
  "sitting crossed leg": "盘腿坐姿",
  "crossed arm standing": "抱臂站姿",
  "shake hands": "握手",
  "Clap your hands standing": "站立鼓掌",
  "hand in back pockets": "双手插后袋",
  "relaxed sitting with one leg": "单腿放松坐姿",
  "relaxed sitting with two legs bent": "双腿弯曲放松坐姿",
  "relaxed sitting with crossed leg": "交叉腿放松坐姿",
  sleeping: "睡姿",
  "sleeping with one hand relaxed": "单手放松睡姿",
  "sleeping with two hand relaxed": "双手放松睡姿",
  "sleeping with two hand relaxed tilted": "侧倾双手放松睡姿",
  "kneel down": "跪姿",
  "kneel down hands wide open": "跪姿张开双手",
  "kneel down praying": "跪姿祈祷",
  "lying down hands wide": "平躺张开双手",
  "arms wide open": "张开双臂",
  shrugging: "耸肩",
  "thinking with right hand": "右手思考姿势",
  "walking forward": "向前行走",
  "side sleeping": "侧睡",
  "raising hand": "举手",
  "Injured Side": "侧身受伤姿势",
};

const poseDisplayName = (pose: PoseEntry) => pose.source === "custom" ? pose.name : (POSE_LABELS[pose.name] ?? pose.name);

/**
 * The mannequin pose editor: library, the selected joint's angles, mirroring
 * and per-part scale.
 *
 * Joint values are read straight off the live figure rather than from a cached
 * map, because the gizmo in the viewport edits the same joints — a cache would
 * be stale the moment a ring is dragged. The stored posture is the render
 * trigger: the gizmo writes it on every change, which re-runs this read.
 */
export default function PosePanel({ character }: { character: SceneObject }) {
  const selectedJointKey = useComposerStore((s) => s.selectedJointKey);
  const partScaleMode = useComposerStore((s) => s.partScaleMode);
  const objectInstances = useComposerStore((s) => s.objectInstances);
  const setPartScaleMode = useComposerStore((s) => s.setPartScaleMode);
  const updatePosture = useComposerStore((s) => s.updateObjectPosture);
  const applyPosture = useComposerStore((s) => s.applyPosture);
  const groundObject = useComposerStore((s) => s.groundObject);
  const resetObjectPose = useComposerStore((s) => s.resetObjectPose);

  const [library, setLibrary] = useState<PoseEntry[]>([]);
  const [appliedPoseId, setAppliedPoseId] = useState<string | null>(null);
  const [poseName, setPoseName] = useState("");

  const figure = objectInstances.get(character.id) as any;
  const config = JOINT_CONFIGS.find((c) => c.mannequinKey === selectedJointKey) ?? null;
  const locked = character.locked;

  const refreshLibrary = () => loadPoseLibrary().then(setLibrary);
  useEffect(() => { refreshLibrary(); }, []);

  /** Writes the figure's live posture back to the store. */
  const commit = () => {
    if (!figure) return;
    figure.updateMatrixWorld(true);
    updatePosture(character.id, readPosture(figure));
  };

  const values = useMemo(() => {
    const joint = config && figure?.[config.mannequinKey];
    if (!joint) return {};
    return Object.fromEntries(
      config!.dofs.map((dof, i) => [`${config!.mannequinKey}:${i}`, getDOF(joint, dof)]),
    );
    // character.posture is not read here but is what makes gizmo drags refresh.
  }, [config, figure, character.posture]);

  const side = sideOf(selectedJointKey);
  const otherSide = side === "l" ? "Right" : "Left";

  // Save makes a new pose, Update rewrites the one that is loaded — so renaming
  // is how the user says which they meant. An unchanged name with a pose loaded
  // is an Update; a name already on another row would only read as a duplicate.
  const loadedPose = library.find((pose) => pose.id === appliedPoseId) ?? null;
  const newName = poseName.trim();
  const nameTaken = library.some((pose) => pose.name === newName && pose.id !== appliedPoseId);
  const canSave = !!figure && !!newName && !nameTaken && newName !== loadedPose?.name;
  const canUpdate = !!figure && !!loadedPose;

  return (
    <div className="pose-panel">
      <p className="pose-hint">
        姿势工具：点击身体部位选择关节，再拖动旋转环。
      </p>

      <section className="pose-section">
        <p className="section-label">姿势库</p>
        <div className="pose-library">
          <div className="pose-entry">
            <button
              className={`pose-preset-btn${appliedPoseId === null ? " active" : ""}`}
              disabled={locked}
              onClick={() => {
                setAppliedPoseId(null);
                setPoseName("");
              }}
            >
              无
            </button>
          </div>
          {library.map((pose) => (
            <div className="pose-entry" key={pose.id}>
              <button
                className={`pose-preset-btn${appliedPoseId === pose.id ? " active" : ""}`}
                disabled={locked}
                onClick={() => {
                  if (appliedPoseId === pose.id) {
                    setAppliedPoseId(null);
                    setPoseName("");
                  } else {
                    applyPosture(character.id, pose.posture);
                    setAppliedPoseId(pose.id);
                    setPoseName(pose.name);
                  }
                }}
              >
                {poseDisplayName(pose)}
              </button>
              {pose.source === "custom" && (
                <button
                  className="pose-delete-btn"
                  title="删除这个姿势"
                  onClick={() => {
                    deleteCustomPose(pose.id);
                    if (appliedPoseId === pose.id) {
                      setAppliedPoseId(null);
                      setPoseName("");
                    }
                    refreshLibrary();
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {library.length === 0 && <p className="pose-hint">暂无姿势。</p>}
        </div>

        <div className="pose-save-row">
          <input
            className="pose-name-input"
            placeholder="姿势名称"
            value={poseName}
            onChange={(e) => setPoseName(e.target.value)}
          />
          <button
            className="inspector-btn"
            title={
              nameTaken
                ? "姿势库中已有同名姿势"
                : "先输入新名称，再将当前姿势添加到姿势库"
            }
            disabled={!canSave}
            onClick={() => {
              const saved = saveCustomPose(newName, readPosture(figure));
              setAppliedPoseId(saved.id);
              setPoseName(saved.name);
              refreshLibrary();
            }}
          >
            保存
          </button>
          <button
            className="inspector-btn"
            title="用人物当前姿势覆盖已载入的姿势"
            disabled={!canUpdate}
            onClick={() => {
              const updated = updatePose(loadedPose!.id, newName, readPosture(figure));
              setPoseName(updated.name);
              refreshLibrary();
            }}
          >
            更新
          </button>
        </div>
      </section>

      <section className="pose-section">
        <div className="pose-button-grid">
          <button className="inspector-btn" onClick={() => groundObject(character.id)}>
            落地
          </button>
          <button className="inspector-btn" onClick={() => resetObjectPose(character.id)}>
            重置姿势
          </button>
        </div>
      </section>

      {config && figure ? (
        <section className="pose-section">
          <p className="section-label">{zhJointLabel(config.label)}</p>

          {side && (
            <div className="pose-button-grid">
              <button
                className="inspector-btn"
                disabled={locked}
                onClick={() => { mirrorJoint(figure, selectedJointKey!, true); commit(); }}
              >
                镜像整条肢体 → {otherSide === "Right" ? "右侧" : "左侧"}
              </button>
              <button
                className="inspector-btn"
                disabled={locked}
                onClick={() => { mirrorJoint(figure, selectedJointKey!, false); commit(); }}
              >
                当前关节 → {otherSide === "Right" ? "右侧" : "左侧"}
              </button>
            </div>
          )}

          <JointControls
            only={config.mannequinKey}
            values={values}
            disabled={locked}
            onChange={(cfg, dofIndex, value) => {
              setDOF(figure[cfg.mannequinKey], cfg.dofs[dofIndex], value);
              commit();
            }}
          />

          <JointRotation
            figure={figure}
            jointKey={config.mannequinKey}
            disabled={locked}
            onCommit={commit}
          />

          <button
            className={`inspector-btn${partScaleMode ? " on" : ""}`}
            onClick={() => setPartScaleMode(!partScaleMode)}
          >
            {partScaleMode ? "正在缩放部位" : "缩放部位"}
          </button>
          {partScaleMode && <PartScale figure={figure} jointKey={config.mannequinKey} />}
        </section>
      ) : (
        <p className="pose-hint">尚未选择关节。</p>
      )}
    </div>
  );
}

const AXES = ["x", "y", "z"] as const;

/**
 * The joint's raw euler in degrees — the prototype's own rotation control, and
 * the same three numbers the gizmo rings drive.
 *
 * The named angles above (raise / straddle / bend / …) are the anatomical subset
 * mannequin-js exposes; an elbow, for instance, only names its bend. The twist
 * that praying hands, crossed arms or a hand in a pocket need has no name, so it
 * is only reachable here. `Posture.extra` is what keeps it through a save.
 */
function JointRotation({
  figure,
  jointKey,
  disabled,
  onCommit,
}: {
  figure: any;
  jointKey: string;
  disabled?: boolean;
  onCommit: () => void;
}) {
  const joint = figure[jointKey];
  if (!joint) return null;

  // The named setters each reorder to suit their own axis, so the euler must be
  // put back in XYZ before its components mean anything. Orientation is unchanged.
  joint.rotation.reorder("XYZ");

  return (
    <div className="pose-scale">
      <p className="section-label">旋转角度 °</p>
      <div className="number-inputs-row">
        {AXES.map((axis) => (
          <div className="number-input-row" key={axis}>
            <span className="number-input-label">{axis.toUpperCase()}</span>
            <input
              className="number-input"
              type="number"
              step={1}
              disabled={disabled}
              value={Math.round((joint.rotation[axis] * 180) / Math.PI * 10) / 10}
              onChange={(e) => {
                const deg = parseFloat(e.target.value);
                if (!Number.isFinite(deg)) return;
                joint.rotation.reorder("XYZ");
                joint.rotation[axis] = (deg * Math.PI) / 180;
                onCommit();
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Scales `joint.image` — the part's own shape. Child joints hang off the
 * joint's `imageWrapper`, so scaling the joint or the wrapper would take the
 * whole limb chain with it.
 *
 * ponytail: part scale is not carried in the v7 posture, so it survives a
 * session but not a saved pose. Storing it needs a field beside `posture`,
 * never a change to the v7 format.
 */
function PartScale({ figure, jointKey }: { figure: any; jointKey: string }) {
  const image = figure[jointKey]?.image;
  const [scale, setScale] = useState<[number, number, number]>([1, 1, 1]);

  useEffect(() => {
    if (image) setScale([image.scale.x, image.scale.y, image.scale.z]);
  }, [image]);

  if (!image) return null;

  const write = (next: [number, number, number]) => {
    image.scale.set(...next);
    figure.updateMatrixWorld(true);
    setScale(next);
  };

  return (
    <div className="pose-scale">
      <div className="number-inputs-row">
        {(["X", "Y", "Z"] as const).map((label, axis) => (
          <div className="number-input-row" key={label}>
            <span className="number-input-label">{label}</span>
            <input
              className="number-input"
              type="number"
              min={0.1}
              step={0.05}
              value={scale[axis]}
              onChange={(e) => {
                const factor = parseFloat(e.target.value);
                if (!Number.isFinite(factor) || factor <= 0) return; // 0 collapses the shape
                const next = [...scale] as [number, number, number];
                next[axis] = factor;
                write(next);
              }}
            />
          </div>
        ))}
      </div>
      <button className="inspector-btn" onClick={() => write([1, 1, 1])}>
        重置部位缩放
      </button>
    </div>
  );
}
