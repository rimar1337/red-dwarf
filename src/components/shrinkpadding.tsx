import { useEffect, useState } from "react";

export default function ShrinkingBox() {
  const [size, setSize] = useState(2000);

  useEffect(() => {
    const interval = setInterval(() => {
      setSize(prev => Math.max(prev - 125, 0));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        //width: `${size}px`,
        height: `${size}px`,
        //backgroundColor: "skyblue",
        transition: "all 0.5s ease",
      }}
    />
  );
}