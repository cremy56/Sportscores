import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Center, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Een enkel 3D-segment van de donut
function Segment({ 
  percentage, 
  color, 
  arc, 
  rotationZ,
  isBackground = false,
  onClick,
  name,
  icon
}) {
  const geometry = useMemo(() => {
    return new THREE.TorusGeometry(1.5, 0.3, 16, 100, arc * (percentage / 100));
  }, [percentage, arc]);

  return (
    <group rotation={[0, 0, rotationZ]}>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={isBackground ? null : () => onClick(name, percentage)}
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial 
            color={color} 
            roughness={0.4} 
            metalness={0.1} 
            transparent={isBackground}
            opacity={isBackground ? 0.1 : 1}
        />
      </mesh>
      
      {!isBackground && (
        <group rotation={[0, 0, arc * (percentage / 100) / 2]}>
          <Text
            position={[1.5, 0, 0.35]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            rotation={[Math.PI / 2, 0, 0]}
            outlineWidth={0.01}
            outlineColor="#333"
          >
            {`${name}\n${icon} ${percentage}%`}
          </Text>
        </group>
      )}
    </group>
  );
}

// Het centrale 3D-hart
function Heart({ bpm, onHeartClick }) {
    const heartRef = useRef();
    const shape = useMemo(() => {
        const x = 0, y = 0;
        const heartShape = new THREE.Shape();
        heartShape.moveTo( x + 5, y + 5 );
        heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
        heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
        heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
        heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
        heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
        heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );
        return heartShape;
    }, []);

    const extrudeSettings = { depth: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };
    
    useFrame(({ clock }) => {
        if (heartRef.current) {
            heartRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.05);
        }
    });

    return (
        <Center>
            <group ref={heartRef} scale={0.03} position={[0,0,0.3]} onClick={(e) => { e.stopPropagation(); onHeartClick(bpm); }}>
                <mesh>
                    <extrudeGeometry args={[shape, extrudeSettings]} />
                    <meshStandardMaterial color="#e53935" roughness={0.2} metalness={0.3} />
                </mesh>
                <Text color="white" fontSize={5} position={[5, 8, 3]} anchorX="center" anchorY="middle">{bpm}</Text>
                <Text color="white" fontSize={2} position={[5, 4, 3]} anchorX="center" anchorY="middle">BPM</Text>
            </group>
        </Center>
    );
}

// De hoofdcomponent die de 3D-scène opbouwt
export default function WelzijnKompas({
    beweging = 85, mentaal = 88, voeding = 75, slaap = 68, hartslag = 72,
    onKompasClick = (type, value) => console.log(`Klik op ${type}: ${value}`),
}) {
    const kompasData = useMemo(() => [
      { name: 'Beweging', value: beweging, color: '#007bff', icon: '👟', startAngle: Math.PI / 2 },
      { name: 'Mentaal', value: mentaal, color: '#ff9800', icon: '🧠', startAngle: 0 },
      { name: 'Voeding', value: voeding, color: '#4caf50', icon: '🍏', startAngle: -Math.PI / 2 },
      { name: 'Slaap', value: slaap, color: '#673ab7', icon: '🌙', startAngle: Math.PI },
    ], [beweging, mentaal, voeding, slaap]);
    const segmentAngle = Math.PI / 2;

    return (
        <div style={{ height: "450px", width: "100%", cursor: 'grab' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={1} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                
                <group rotation-x={-0.3}>
                    {kompasData.map((item) => (
                        <React.Fragment key={item.name}>
                            <Segment
                                percentage={100} color="#e2e8f0" arc={segmentAngle}
                                rotationZ={item.startAngle} isBackground={true}
                            />
                            <Segment
                                percentage={item.value} color={item.color} arc={segmentAngle}
                                rotationZ={item.startAngle} onClick={onKompasClick}
                                name={item.name} icon={item.icon}
                            />
                        </React.Fragment>
                    ))}
                    <Heart bpm={hartslag} onHeartClick={() => onKompasClick('Hartslag', hartslag)} />
                </group>
                
                {/* Deze controls laten u met de muis slepen, draaien en zoomen */}
                <OrbitControls enableZoom={true} enablePan={false} />
            </Canvas>
        </div>
    );
}