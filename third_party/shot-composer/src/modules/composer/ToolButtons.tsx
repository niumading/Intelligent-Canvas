export type GizmoTool = "move" | "rotate" | "scale" | "pose";

interface ToolButtonsProps {
  activeTool: string;
  canPose: boolean;
  onToolChange: (tool: GizmoTool) => void;
}

export default function ToolButtons({ activeTool, canPose, onToolChange }: ToolButtonsProps) {
  return (
    <div className="workspace-toolbar-tools">
      <button
        className={activeTool === "move" ? "on" : ""}
        onClick={() => onToolChange("move")}
        title="移动（平移）"
      >
        移动
      </button>
      <button
        className={activeTool === "rotate" ? "on" : ""}
        onClick={() => onToolChange("rotate")}
        title="旋转"
      >
        旋转
      </button>
      <button
        className={activeTool === "scale" ? "on" : ""}
        onClick={() => onToolChange("scale")}
        title="缩放"
      >
        缩放
      </button>
      <button
        className={activeTool === "pose" ? "on" : ""}
        onClick={() => onToolChange("pose")}
        disabled={!canPose}
        title={canPose ? "姿势（旋转身体关节）" : "只有人体白模可以调整姿势"}
      >
        姿势
      </button>
    </div>
  );
}
