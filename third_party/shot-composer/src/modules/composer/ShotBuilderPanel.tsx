/**
 * The redesigned right-panel "Shot" tab: a live preview plus one icon row per
 * axis (Shot Size, Camera Angle, Elevation, Composition). Every click updates
 * `params` and, through it, the preview — there is no separate Apply button.
 * Reuses the same ShotParams/solveShot/describeShot the Library already
 * established; this panel only supplies a friendlier UI on top, never a
 * second copy of the shot math.
 */
import type { ShotParams } from "../library/calibration/shotSolver";
import { ANGLE_OPTIONS, ELEVATION_OPTIONS, SHOT_SIZE_OPTIONS } from "../library/calibration/shotAxes";
import { COMPOSITION_PRESETS } from "../library/calibration/compositionPresets";
import { AngleIcon, CompositionIcon, ElevationIcon, ShotSizeIcon } from "./ShotBuilderIcons";
import { ShotPreview } from "./ShotPreview";
import * as THREE from "three";

export const SHOT_PREVIEW_WIDTH = 260;
export const SHOT_PREVIEW_HEIGHT = 146;

const OPTION_LABELS: Record<string, string> = {
  Wide: "远景", Full: "全身", Medium: "中景", MCU: "中近景", "Close-Up": "特写",
  Front: "正面", "3/4 Left": "左前侧", "3/4 Right": "右前侧", Profile: "侧面", Back: "背面", "Over the Shoulder": "过肩",
  "Eye Level": "平视", Low: "低机位", High: "高机位",
  Center: "居中", "Left Third": "左三分位", "Right Third": "右三分位", "Upper Third": "上三分位", "Lower Third": "下三分位", "Negative Space": "留白",
};

const zhLabel = (label: string) => OPTION_LABELS[label] ?? label;

export function ShotBuilderPanel({
  params,
  onChange,
  scene,
  camera,
  canCompose,
  onAddToTimeline,
  editingSegmentLabel,
  onUpdateSegment,
  onCancelEdit,
}: {
  params: ShotParams;
  onChange: (next: ShotParams) => void;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  canCompose: boolean;
  /** Motion mode only: appends the current shot params (framing the current selection) as a new segment on the sequence camera. Omit to hide the button (e.g. in Static, which has its own shot strip). */
  onAddToTimeline?: () => void;
  /** Set once a Shot Sequence card is selected for editing (see ShotSequenceTimeline) — swaps the action button from "add" to "update this segment" and labels which shot is currently loaded. */
  editingSegmentLabel?: string | null;
  onUpdateSegment?: () => void;
  onCancelEdit?: () => void;
}) {
  if (!canCompose) {
    return (
      <p className="shotbuilder-empty">
        请先在场景中选择一个对象，再进行镜头构图。
      </p>
    );
  }

  return (
    <div className="shotbuilder">
      <ShotBuilderRow label="景别">
        {SHOT_SIZE_OPTIONS.map(([id, label]) => (
          <OptionButton key={id} label={zhLabel(label)} active={params.shotSize === id} onClick={() => onChange({ ...params, shotSize: id })}>
            <ShotSizeIcon shotSize={id} />
          </OptionButton>
        ))}
      </ShotBuilderRow>

      <ShotBuilderRow label="拍摄角度">
        {ANGLE_OPTIONS.map(([id, label]) => (
          <OptionButton key={id} label={zhLabel(label)} active={params.angle === id} onClick={() => onChange({ ...params, angle: id })}>
            <AngleIcon angle={id} />
          </OptionButton>
        ))}
      </ShotBuilderRow>

      <ShotBuilderRow label="机位高度">
        {ELEVATION_OPTIONS.map(([id, label]) => (
          <OptionButton key={id} label={zhLabel(label)} active={params.elevation === id} onClick={() => onChange({ ...params, elevation: id })}>
            <ElevationIcon elevation={id} />
          </OptionButton>
        ))}
      </ShotBuilderRow>

      <ShotBuilderRow label="构图">
        {COMPOSITION_PRESETS.map((preset) => (
          <OptionButton
            key={preset.id}
            label={zhLabel(preset.label)}
            active={params.composition.id === preset.id}
            onClick={() => onChange({ ...params, composition: preset })}
          >
            <CompositionIcon composition={preset} />
          </OptionButton>
        ))}
      </ShotBuilderRow>

      <ShotPreview scene={scene} camera={camera} width={SHOT_PREVIEW_WIDTH} height={SHOT_PREVIEW_HEIGHT} />

      {onAddToTimeline && (
        editingSegmentLabel ? (
          <div className="shotbuilder-editing-actions">
            <button type="button" className="composer-add-shot-btn primary" onClick={onUpdateSegment} title="将这些修改保存到所选镜头">
              更新片段
            </button>
            <button type="button" className="composer-add-shot-btn" onClick={onCancelEdit} title="停止编辑此片段">
              取消
            </button>
          </div>
        ) : (
          <button type="button" className="composer-add-shot-btn primary" onClick={onAddToTimeline} title="将当前构图作为新镜头添加到时间线">
            + 添加到时间线
          </button>
        )
      )}

      {onAddToTimeline && (
        <div className="shotbuilder-current">
          {editingSegmentLabel ? `正在编辑：${editingSegmentLabel}` : "正在设置新镜头，尚未添加到时间线"}
        </div>
      )}
    </div>
  );
}

function ShotBuilderRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="shotbuilder-row">
      <div className="shotbuilder-row-label">{label}</div>
      <div className="shotbuilder-options">{children}</div>
    </div>
  );
}

function OptionButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`shotbuilder-opt${active ? " active" : ""}`} onClick={onClick} title={label}>
      {children}
      <span>{label}</span>
    </button>
  );
}
