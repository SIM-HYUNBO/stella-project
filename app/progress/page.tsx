'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';


export default function ProgressPage({ params }: { params: { userId: string } }) {
  const userId = params.userId; // <-- 여기서 userId
  const [progressData, setProgressData] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 페이지 렌더링 시 자동으로 Firestore 데이터 가져오기
  useEffect(() => {
    const fetchProgress = async () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, 'userProgress'),
        where('userId', '==', userId),
        where('timestamp', '>=', sevenDaysAgo),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      setProgressData(snapshot.docs.map(doc => doc.data()));
    };
    fetchProgress();
  }, [userId]);

  // Canvas로 꺾은선 그래프 그리기
  useEffect(() => {
    if (!canvasRef.current || progressData.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const timestamps = progressData.map(d => d.timestamp);
    const minX = Math.min(...timestamps);
    const maxX = Math.max(...timestamps);
    const maxY = Math.max(...progressData.map(d => Math.max(d.solved, d.score)));

    // 축 그리기
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // x축 레이블
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    timestamps.forEach(ts => {
      const x = padding + ((ts - minX) / (maxX - minX)) * (width - 2 * padding);
      const date = new Date(ts);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(label, x, height - padding + 15);
    });

    // y축 레이블
    ctx.textAlign = 'right';
    for (let i = 0; i <= maxY; i += Math.ceil(maxY / 5)) {
      const y = height - padding - (i / maxY) * (height - 2 * padding);
      ctx.fillText(i.toString(), padding - 5, y + 3);
    }

    // 선 그리기
    const drawLine = (color: string, key: 'solved' | 'score') => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      progressData.forEach((d, i) => {
        const x = padding + ((d.timestamp - minX) / (maxX - minX)) * (width - 2 * padding);
        const y = height - padding - (d[key] / maxY) * (height - 2 * padding);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine('#8884d8', 'solved'); // 문제 수
    drawLine('#82ca9d', 'score');  // 점수
  }, [progressData]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Your Weekly Progress</h1>
      {progressData.length === 0 ? (
        <div className="text-gray-500 mt-4">No progress yet. Complete some problems on the Study page to see your stats.</div>
      ) : (
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          style={{ width: '100%', maxWidth: '600px', border: '1px solid #ccc' }}
        />
      )}
    </div>
  );
}
