// src/components/ui/circular-progress.tsx
'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

interface CircularProgressProps {
  value: number;
  colorClass: string;
}

export const CircularProgress = ({ value, colorClass }: CircularProgressProps) => {
  const { theme } = useTheme();
  const progressValue = Math.min(Math.max(value, 0), 100);

  // Extract HSL values from Tailwind variable
  const colorMatch = colorClass.match(/bg-(\w+)-(\d+)/);
  let color = 'hsl(var(--primary))';
  if (colorMatch) {
      const colorName = colorMatch[1];
      const colorShade = colorMatch[2];
      
      // Simple mapping - this should be expanded or improved for production
      switch(colorName) {
          case 'orange': color = `hsl(24.6 95% 53.1%)`; break; // orange-500
          case 'blue': color = `hsl(221.2 83.2% 53.3%)`; break; // blue-500
          case 'yellow': color = `hsl(47.9 95.8% 53.1%)`; break; // yellow-500
          case 'pink': color = `hsl(322.4 82.3% 54.3%)`; break; // pink-500
      }
  }


  const data = [
    { name: 'completed', value: progressValue, color: color },
    { name: 'remaining', value: 100 - progressValue, color: theme === 'dark' ? 'hsl(var(--muted) / 0.2)' : 'hsl(var(--muted))' },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          startAngle={90}
          endAngle={450}
          innerRadius="75%"
          outerRadius="100%"
          cy="50%"
          cx="50%"
          paddingAngle={0}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                // Apply corner radius to the first and last segments
                cornerRadius={index === 0 && progressValue > 0 ? 999 : 0}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
