import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Center } from '@react-three/drei';
import * as THREE from 'three';

// Een enkel 3D-segment van de donut. Tekst-logica is hierin verwerkt.
function Segment({ 
  percentage, 
  baseColor, 
  segmentAngle, 
  rotationY,
  isBackground = false,
  onClick,
  name,
  icon
}) {
  const geometry = useMemo(() => {
    return new THREE.TorusGeometry(
      1.25, // Gemiddelde radius
      0.25, // Breedte van de 'donut'
      16,   // radialSegments
      50,   // tubularSegments
      segmentAngle * (percentage / 100)
    );
  }, [percentage, segmentAngle]);

  // Bereken de positie voor de tekst en het icoon in het midden van de boog
  const textPosition = useMemo(() => {
    const angle = (segmentAngle * (percentage / 100)) / 2;
    const radius = 1.25;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.3];
  }, [segmentAngle, percentage]);

  return (
    <group rotation={[Math.PI / 2, 0, rotationY]} onClick={isBackground ? null : () => onClick(name, percentage)}>
      <mesh geometry={geometry}>
        <meshStandardMaterial 
            color={baseColor} 
            roughness={0.4} 
            metalness={0.1} 
            transparent={isBackground}
            opacity={isBackground ? 0.15 : 1}
        />
      </mesh>
      
      {/* FIX 2: Tekst en iconen worden nu correct in dit component getekend */}
      {!isBackground && (
        <group rotation={[-Math.PI / 2, 0, 0]}>
             <Text position={textPosition} fontSize={0.15} color="white" anchorX="center" anchorY="top" fontWeight="bold">
                {name}
             </Text>
             <Text position={[textPosition[0], textPosition[1] - 0.18, textPosition[2]]} fontSize={0.2} color="white" anchorX="center" anchorY="middle" fontWeight="bold">
                {icon}
             </Text>
             <Text position={[textPosition[0], textPosition[1] - 0.36, textPosition[2]]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" fontWeight="bold">
                {percentage}%
             </Text>
        </group>
      )}
    </group>
  );
}

// Het centrale 3D-hart (onveranderd)
function Heart({ bpm, onHeartClick }) {
    const heartRef = useRef();
    const shape = useMemo(() => {
        const x = -2.5, y = -5;
        const heartShape = new THREE.Shape();
        heartShape.moveTo( x + 2.5, y + 2.5 );
        heartShape.bezierCurveTo( x + 2.5, y + 2.5, x + 2, y, x, y );
        heartShape.bezierCurveTo( x - 3, y, x - 3, y + 3.5,x - 3, y + 3.5 );
        heartShape.bezierCurveTo( x - 3, y + 5.5, x - 1.5, y + 7.7, x + 2.5, y + 9.5 );
        heartShape.bezierCurveTo( x + 6, y + 7.7, x + 8, y + 5.5, x + 8, y + 3.5 );
        heartShape.bezierCurveTo( x + 8, y + 3.5, x + 8, y, x + 5, y );
        heartShape.bezierCurveTo( x + 3.5, y, x + 2.5, y + 2.5, x + 2.5, y + 2.5 );
        return heartShape;
    }, []);
    const extrudeSettings = { depth: 0.8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.3, bevelThickness: 0.3 };
    useFrame(({ clock }) => {
        if (heartRef.current) {
            heartRef.current.scale.setScalar(0.15 + Math.sin(clock.elapsedTime * 4) * 0.01);
        }
    });
    return (
        <Center>
            <group ref={heartRef} onClick={(e) => { e.stopPropagation(); onHeartClick(bpm); }}>
                <mesh>
                    <extrudeGeometry args={[shape, extrudeSettings]} />
                    <meshStandardMaterial color="#e53935" roughness={0.2} metalness={0.3} />
                </mesh>
                <Text color="white" fontSize={0.35} position-z={0.8} anchorX="center" anchorY="middle">{bpm}</Text>
                <Text color="white" fontSize={0.15} position-y={-0.3} position-z={0.8} anchorX="center" anchorY="middle">BPM</Text>
            </group>
        </Center>
    );
}

// De hoofdcomponent
export default function WelzijnKompas({
    beweging = 85, mentaal = 88, voeding = 75, slaap = 68, hartslag = 72,
    onKompasClick = (type, value) => console.log(`Klik op ${type}: ${value}`),
}) {
    const kompasData = useMemo(() => [
      // FIX 3: Correcte iconen
      { name: 'Beweging', value: beweging, color: '#007bff', icon: '👟', rotation: Math.PI * 0.5 },
      { name: 'Mentaal', value: mentaal, color: '#ff9800', icon: '🧠', rotation: 0 },
      { name: 'Voeding', value: voeding, color: '#4caf50', icon: '🍏', rotation: Math.PI * 1.5 },
      { name: 'Slaap', value: slaap, color: '#673ab7', icon: '🌙', rotation: Math.PI },
    ], [beweging, mentaal, voeding, slaap]);
    const segmentAngle = Math.PI / 2;

    return (
        <div style={{ height: "450px", width: "100%" }}>
            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <ambientLight intensity={0.9} />
                <pointLight position={[10, 10, 5]} intensity={1} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} />

                <group rotation-x={-0.2}> 
                    <group>
                        {kompasData.map((item) => (
                            <React.Fragment key={item.name}>
                                <Segment
                                    percentage={100}
                                    baseColor="#e2e8f0"
                                    segmentAngle={segmentAngle}
                                    rotationY={item.rotation}
                                    isBackground={true}
                                />
                                <Segment
                                    percentage={item.value}
                                    baseColor={item.color}
                                    segmentAngle={segmentAngle}
                                    rotationY={item.rotation}
                                    onClick={onKompasClick}
                                    name={item.name}
                                    icon={item.icon}
                                />
                            </React.Fragment>
                        ))}
                    </group>
                    
                    <Heart bpm={hartslag} onHeartClick={() => onKompasClick('Hartslag', hartslag)} />
                </group>
                
                {/* FIX 1: Verwijderde dubbele Heart-aanroep. Deze is weggehaald. */}

            </Canvas>
        </div>
    );
}