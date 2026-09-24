import * as THREE from "three";
import { useComposerStore } from "../../stores/composerStore";
import { CameraViewfinder } from "./CameraViewfinder";

interface CameraInspectorPanelProps {
  scene: THREE.Scene | null;
  cameraInstance: THREE.Camera | null;
}

const numberInputStyle = { width: 64 };
const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };

/** Shown instead of PoseLibraryPanel when the selected object is a cinematic camera. */
export function CameraInspectorPanel({ scene, cameraInstance }: CameraInspectorPanelProps) {
  const selectedObjectId = useComposerStore((s) => s.selectedObjectId);
  const objects = useComposerStore((s) => s.objects);
  const updateObjectFov = useComposerStore((s) => s.updateObjectFov);
  const activeCameraId = useComposerStore((s) => s.activeCameraId);
  const setActiveCamera = useComposerStore((s) => s.setActiveCamera);
  const setCameraRig = useComposerStore((s) => s.setCameraRig);

  const object = objects.find((o) => o.id === selectedObjectId);
  if (!object || object.type !== "camera") return null;

  const isActive = activeCameraId === object.id;
  const rig = object.cameraRig ?? null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 className="pose-section-header">摄像机</h3>
      <CameraViewfinder scene={scene} camera={cameraInstance} />
      <label style={rowStyle}>
        <span style={{ fontSize: 13 }}>当前查看摄像机</span>
        <button
          onClick={() => setActiveCamera(object.id)}
          disabled={isActive}
          title={isActive ? "这是当前摄像机" : "使用此摄像机进行预览和导出"}
        >
          {isActive ? "当前" : "设为当前"}
        </button>
      </label>
      {rig && (
        <label style={rowStyle}>
          <span style={{ fontSize: 13 }}>摄像机绑定</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{rig.type} 绑定已启用</span>
            <button onClick={() => setCameraRig(object.id, null)} title="清除摄像机绑定">清除</button>
          </span>
        </label>
      )}
      <label style={rowStyle}>
        <span style={{ fontSize: 13 }}>视野角度</span>
        <input
          type="number" min={10} max={120} step={1}
          value={Math.round(object.fov ?? 10)}
          onChange={(e) => updateObjectFov(object.id, Number(e.target.value))}
          style={numberInputStyle}
        />
      </label>
    </div>
  );
}
