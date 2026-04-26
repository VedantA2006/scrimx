import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath } from '@xyflow/react';

const TimelineEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  
  // Decide layout curve structurally:
  // If source and target X are identical, it is a Main Flow -> use straight path.
  // If source and target X are different, it is a Branch -> use generic Bezier.
  const isStraight = Math.abs(sourceX - targetX) < 10;
  
  let edgePath, labelX, labelY;
  
  if (isStraight) {
     [edgePath, labelX, labelY] = getStraightPath({
        sourceX, sourceY, targetX, targetY
     });
  } else {
     [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
     });
  }

  const isPaidFlow = style.stroke === '#f97316' || style.stroke === '#ec4899'; // Orange or Pink
  
  // Base rendering variables
  const rStart = data?.rankStart || 1;
  const rEnd = data?.rankEnd || 10;

  return (
    <>
      <BaseEdge 
          path={edgePath} 
          markerEnd={markerEnd} 
          style={{
             ...style,
             strokeWidth: isStraight ? 4 : 2,
             strokeDasharray: isStraight ? 'none' : '5,5',
             opacity: 0.8
          }} 
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`px-3 py-1.5 rounded-lg border shadow-xl flex flex-col items-center justify-center bg-dark-950 backdrop-blur-md ${isPaidFlow ? 'border-orange-500/50' : 'border-surface-border'}`}
        >
           <span className="font-bold text-xs text-white uppercase tracking-wider whitespace-nowrap">
              Rank {rStart} - {rEnd}
           </span>
           <span className="font-semibold text-[9px] text-dark-400 uppercase tracking-widest mt-0.5">
              Advance
           </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default TimelineEdge;
