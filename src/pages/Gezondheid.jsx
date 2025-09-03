import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Center } from '@react-three/drei';
import * as THREE from 'three';

// Een enkel 3D-segment van de donut. Nu met een 'isBackground' optie.
function Segment({ 
  percentage, 
  baseColor, 
  segmentAngle, 
  rotationY,
  isBackground = false,
  onClick
}) {
  const geometry = useMemo(() => {
    return new THREE.TorusGeometry(
      1.25, // Gemiddelde radius
      0.25, // Breedte van de 'donut'
      16,   // radialSegments
      50,   // tubularSegments
      segmentAngle * (percentage / 100) // De booglengte, dynamisch voor voorgrond, vast voor achtergrond
    );
  }, [percentage, segmentAngle]);

  return (
    <group rotation={[Math.PI / 2, 0, rotationY]} onClick={isBackground ? null : onClick}>
      <mesh geometry={geometry}>
        <meshStandardMaterial 
            color={baseColor} 
            roughness={0.4} 
            metalness={0.1} 
            // Achtergrond is iets transparanter om diepte te suggereren
            transparent={isBackground}
            opacity={isBackground ? 0.2 : 1}
        />
      </mesh>
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

// De hoofdcomponent die de 3D-scène opbouwt
export default function WelzijnKompas({
    beweging = 85,
    mentaal = 88,
    voeding = 75,
    slaap = 68,
    hartslag = 72,
    onKompasClick = (type, value) => console.log(`Klik op ${type}: ${value}`),
}) {
    const kompasData = useMemo(() => [
      { name: 'Beweging', value: beweging, color: '#007bff', icon: '👟', rotation: Math.PI * 0.75 },
      { name: 'Mentaal', value: mentaal, color: '#ff9800', icon: '🧠', rotation: Math.PI * 0.25 },
      { name: 'Voeding', value: voeding, color: '#4caf50', icon: '🍏', rotation: Math.PI * -0.25 },
      { name: 'Slaap', value: slaap, color: '#673ab7', icon: '🌙', rotation: Math.PI * -0.75 },
    ], [beweging, mentaal, voeding, slaap]);

    const segmentAngle = Math.PI / 2; // Elk segment is 90 graden

    return (
        <div style={{ height: "500px", width: "100%", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <directionalLight position={[-10, -10, -5]} intensity={0.5} />

                <Text position={[0, 2.5, 0]} fontSize={0.4} color="#334155" fontWeight="bold">
                    Mijn Welzijn Kompas
                </Text>

                <group>
                    {kompasData.map((item) => (
                        <React.Fragment key={item.name}>
                            {/* LAAG 1: De vaste grijze achtergrond-container */}
                            <Segment
                                percentage={100} // Altijd 100% vol
                                baseColor="#e2e8f0" // Lichtgrijs
                                segmentAngle={segmentAngle}
                                rotationY={item.rotation}
                                isBackground={true}
                            />
                            {/* LAAG 2: De gekleurde, dynamische voorgrond */}
                            <Segment
                                percentage={item.value} // Dynamisch percentage
                                baseColor={item.color}
                                segmentAngle={segmentAngle}
                                rotationY={item.rotation}
                                onClick={() => onKompasClick(item.name, item.value)}
                            />
                            {/* LAAG 3: De iconen en tekst */}
                             <group rotation={[Math.PI / 2, 0, item.rotation]}>
                                <Text 
                                    position={[1.25, 0, 0.3]}
                                    rotation={[-Math.PI / 2, 0, 0]}
                                    fontSize={0.2}
                                    color="white"
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    {item.icon}
                                </Text>
                             </group>
                        </React.Fragment>
                    ))}
                </group>
                
                <Heart bpm={hartslag} onHeartClick={() => onKompasClick('Hartslag', hartslag)} />
            </Canvas>
        </div>
    );
}