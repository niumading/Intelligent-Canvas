import { JOINT_CONFIGS, type JointConfig, type JointDOF } from "./helpers/jointConfig";
import "./JointControls.css";

interface JointControlsProps {
  /** Current values map: "jointKey:dofIndex" -> number */
  values: Record<string, number>;
  /** Called when a slider changes */
  onChange: (config: JointConfig, dofIndex: number, value: number) => void;
  /** Whether controls should be disabled */
  disabled?: boolean;
  /** Show only this joint key, expanded. Omit for the full body list. */
  only?: string;
}

const isFinger = (config: JointConfig) => config.mannequinKey.includes("_finger_");

const LABELS: Record<string, string> = {
  Body: "身体", Torso: "躯干", Head: "头部",
  "Left Arm": "左臂", "Right Arm": "右臂", "Left Elbow": "左肘", "Right Elbow": "右肘",
  "Left Wrist": "左手腕", "Right Wrist": "右手腕", "Left Leg": "左腿", "Right Leg": "右腿",
  "Left Knee": "左膝", "Right Knee": "右膝", "Left Ankle": "左脚踝", "Right Ankle": "右脚踝",
  Bend: "弯曲", Tilt: "倾斜", Turn: "转动", Nod: "点头", Raise: "抬起", Straddle: "侧展",
  "Mid Bend": "中段弯曲", "Tip Bend": "末端弯曲",
};

function zhJointLabel(label: string): string {
  const finger = label.match(/^(Left|Right) (Thumb|Index|Middle|Ring|Little)$/);
  if (finger) {
    const sides: Record<string, string> = { Left: "左", Right: "右" };
    const fingers: Record<string, string> = { Thumb: "拇指", Index: "食指", Middle: "中指", Ring: "无名指", Little: "小指" };
    return `${sides[finger[1]]}${fingers[finger[2]]}`;
  }
  return LABELS[label] ?? label;
}

export default function JointControls({ values, onChange, disabled, only }: JointControlsProps) {
  const sections = (side: "l" | "r") =>
    JOINT_CONFIGS.filter((c) => isFinger(c) && c.mannequinKey.startsWith(`${side}_`));

  if (only) {
    const config = JOINT_CONFIGS.find((c) => c.mannequinKey === only);
    if (!config) return null;
    return (
      <div className="joint-controls">
        <JointSection config={config} values={values} onChange={onChange} disabled={disabled} open />
      </div>
    );
  }

  return (
    <div className="joint-controls">
      {JOINT_CONFIGS.filter((c) => !isFinger(c)).map((config) => (
        <JointSection
          key={config.mannequinKey}
          config={config}
          values={values}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      {(["l", "r"] as const).map((side) => (
        <details className="joint-section" key={side} open={false}>
          <summary className="joint-section-header">
            {side === "l" ? "左手" : "右手"}
          </summary>
          <div className="joint-subsections">
            {sections(side).map((config) => (
              <JointSection
                key={config.mannequinKey}
                config={config}
                values={values}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function JointSection({
  config,
  values,
  onChange,
  disabled,
  open = false,
}: {
  config: JointConfig;
  values: Record<string, number>;
  onChange: (config: JointConfig, dofIndex: number, value: number) => void;
  disabled?: boolean;
  open?: boolean;
}) {
  return (
    <details className="joint-section" open={open}>
      <summary className="joint-section-header">{zhJointLabel(config.label)}</summary>
      <div className="joint-dofs">
        {config.dofs.map((dof, idx) => {
          const key = `${config.mannequinKey}:${idx}`;
          const val = values[key] ?? 0;
          return (
            <JointSlider
              key={key}
              dof={dof}
              value={val}
              disabled={disabled}
              onChange={(v) => onChange(config, idx, v)}
            />
          );
        })}
      </div>
    </details>
  );
}

function JointSlider({
  dof,
  value,
  disabled,
  onChange,
}: {
  dof: JointDOF;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  // mannequin-js accessors are already degrees, as are dof.min/max/step —
  // slider and number input share them directly, no conversion.
  return (
    <div className="joint-slider-row">
      <span className="joint-slider-label">{zhJointLabel(dof.label)}</span>
      <div className="joint-slider-track">
        <input
          type="range"
          className="joint-slider"
          min={dof.min}
          max={dof.max}
          step={dof.step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <div
          className="joint-slider-fill"
          style={{ width: `${((value - dof.min) / (dof.max - dof.min)) * 100}%` }}
        />
      </div>
      <JointNumberInput
        value={value}
        min={dof.min}
        max={dof.max}
        step={dof.step}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function JointNumberInput({
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className="joint-number-input"
      value={parseFloat(value.toFixed(step < 1 ? 2 : 1))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) onChange(val);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const newVal = Math.min(max, value + step);
          onChange(newVal);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const newVal = Math.max(min, value - step);
          onChange(newVal);
        }
      }}
    />
  );
}
