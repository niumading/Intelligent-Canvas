import { useEffect, useState } from "react";
import { useComposerStore, selectCanPose } from "../../stores/composerStore";
import { loadPoseLibrary, saveCustomPose, type PoseEntry } from "../composer/helpers/poseLibrary";
import { readPosture } from "../composer/helpers/posture";
import { MOTION_PRESETS, type MotionPresetContext } from "./motionPresets";

interface PosePreset {
  label: string;
  /** null = placeholder, no posture data exists yet — user poses by hand and saves it. */
  poseId: string | null;
}

// Walk/Run used to live here as single held poses. They're covered by the
// Motion Presets section below now (as real keyframe sequences), so they were
// dropped here to avoid two same-named buttons doing different things.
const PRESETS: PosePreset[] = [
  { label: "自然站姿", poseId: "__default__" },
  { label: "坐姿", poseId: "authored.sitting" },
  { label: "抱臂", poseId: "authored.crossed-arm-standing" },
  { label: "双手叉腰", poseId: null },
  { label: "指向", poseId: null },
  { label: "交谈", poseId: null },
];

const MOTION_LABELS: Record<string, string> = { Walk: "行走", Run: "跑步", Turn: "转身", Wave: "挥手", Idle: "待机" };

export function PoseLibraryPanel() {
  const selectedObjectId = useComposerStore((s) => s.selectedObjectId);
  const objects = useComposerStore((s) => s.objects);
  const objectInstances = useComposerStore((s) => s.objectInstances);
  const canPose = useComposerStore(selectCanPose);
  const updateObjectPosture = useComposerStore((s) => s.updateObjectPosture);
  const setActiveTool = useComposerStore((s) => s.setActiveTool);
  const applyMotionPreset = useComposerStore((s) => s.applyMotionPreset);

  const [library, setLibrary] = useState<PoseEntry[]>([]);
  const [savePrompt, setSavePrompt] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [staticOpen, setStaticOpen] = useState(true);
  const [motionOpen, setMotionOpen] = useState(true);

  useEffect(() => {
    loadPoseLibrary().then(setLibrary);
  }, []);

  const object = objects.find((o) => o.id === selectedObjectId) ?? null;
  const figure = selectedObjectId ? objectInstances.get(selectedObjectId) ?? null : null;

  if (!canPose || !object) {
    return <div style={{ padding: 16, opacity: 0.6, fontSize: 13 }}>请选择一个人体白模。</div>;
  }

  function applyPreset(preset: PosePreset) {
    if (!object || !selectedObjectId) return;
    if (preset.poseId === null) {
      setActiveTool("pose");
      setSavePrompt(preset.label);
      setNameDraft(preset.label);
      return;
    }
    const posture = preset.poseId === "__default__"
      ? object.defaultPosture
      : library.find((p) => p.id === preset.poseId)?.posture;
    if (!posture) return;
    updateObjectPosture(selectedObjectId, posture);
  }

  function handleSaveCustom() {
    if (!figure || !nameDraft.trim()) return;
    saveCustomPose(nameDraft.trim(), readPosture(figure));
    loadPoseLibrary().then(setLibrary);
    setSavePrompt(null);
  }

  const walkPosture = library.find((p) => p.id === "authored.walking-forward")?.posture;
  const runPosture = library.find((p) => p.id === "authored.running-with-right-hand-forward")?.posture;

  function applyMotion(presetId: string) {
    if (!object || !selectedObjectId) return;
    const preset = MOTION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const ctx: MotionPresetContext = {
      transform: object.transform,
      neutralPosture: object.defaultPosture,
      currentPosture: object.posture ?? object.defaultPosture,
      walkPosture,
      runPosture,
    };
    applyMotionPreset(selectedObjectId, preset.build(ctx));
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 className="pose-section-header" onClick={() => setStaticOpen((v) => !v)}>
        静态姿势
        <span className="chevron">{staticOpen ? "▾" : "▸"}</span>
      </h3>
      {staticOpen && PRESETS.map((preset) => (
        <button key={preset.label} onClick={() => applyPreset(preset)} style={{ textAlign: "left" }}>
          {preset.label}{preset.poseId === null ? "（自定义）" : ""}
        </button>
      ))}
      <h3 className="pose-section-header" style={{ marginTop: 12 }} onClick={() => setMotionOpen((v) => !v)}>
        动作预设
        <span className="chevron">{motionOpen ? "▾" : "▸"}</span>
      </h3>
      {motionOpen && MOTION_PRESETS.map((preset) => {
        const missing = preset.requires.some((need) =>
          need === "walk" ? !walkPosture : !runPosture,
        );
        return (
          <button
            key={preset.id}
            onClick={() => applyMotion(preset.id)}
            disabled={missing}
            title={missing ? "缺少此动作需要的姿势预设" : `创建${MOTION_LABELS[preset.label] ?? preset.label}关键帧序列`}
            style={{ textAlign: "left" }}
          >
            {MOTION_LABELS[preset.label] ?? preset.label}
          </button>
        );
      })}
      {savePrompt && (
        <div style={{ marginTop: 8, padding: 8, border: "1px solid #2a2e37", borderRadius: 4 }}>
          <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 6px" }}>
            手动调整“{object.name ?? object.id}”的姿势，然后保存为“{savePrompt}”。
          </p>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ width: "100%", marginBottom: 6 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSaveCustom}>保存自定义姿势</button>
            <button onClick={() => setSavePrompt(null)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
