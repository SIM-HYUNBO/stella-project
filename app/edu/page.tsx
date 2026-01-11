'use client';
import HamburgerMenu from "../../components/hamburgermenu";
import { useRouter } from 'next/navigation';
import PageContainer from "../../components/PageContainer";
import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/* ================= 타입 ================= */
type MathFormula = {
  title: string;
  formula: string;
  description: string;
  example: string;
  date: Timestamp;
};

type ScienceConcept = {
  title: string;
  description: string;
  example: string;
  date: Timestamp;
};

type EnglishWord = {
  word: string;
  meaning: string;
  example: string;
  date: Timestamp;
};

export default function EducationPage() {
  const [math, setMath] = useState<MathFormula | null>(null);
  const [science, setScience] = useState<ScienceConcept | null>(null);
  const [english, setEnglish] = useState<EnglishWord | null>(null);
  const [englishUploadCount, setEnglishUploadCount] = useState(0);
  const maxEnglishUploads = 7;

  const router = useRouter();

  const [showMath, setShowMath] = useState(false);
  const [showMathUpload, setShowMathUpload] = useState(false);
  const [showScience, setShowScience] = useState(false);
  const [showScienceUpload, setShowScienceUpload] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showEnglishUpload, setShowEnglishUpload] = useState(false);

  const [canUploadMath, setCanUploadMath] = useState(false);
  const [canUploadScience, setCanUploadScience] = useState(false);
  const [canUploadEnglish, setCanUploadEnglish] = useState(false);

  const [mathInput, setMathInput] = useState({
    title: '',
    formula: '',
    description: '',
    example: '',
  });
  const [scienceInput, setScienceInput] = useState({
    title: '',
    description: '',
    example: '',
  });
  const [englishInput, setEnglishInput] = useState({
    word: '',
    meaning: '',
    example: '',
  });

  /* ================= 오늘 자료 가져오기 ================= */
  useEffect(() => {
    const fetchToday = async (col: string, setter: any) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, col),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setter(snap.empty ? null : snap.docs[0].data());
    };

    const fetchEnglishCount = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'englishWords'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );
      const snap = await getDocs(q);
      setEnglishUploadCount(snap.size);
    };

    fetchToday('mathFormulas', setMath);
    fetchToday('scienceConcepts', setScience);
    fetchToday('englishWords', setEnglish);
    fetchEnglishCount();
  }, []);

  /* ================= 업로드 가능 여부 결정 ================= */
  useEffect(() => {
    setCanUploadMath(!math);
    setCanUploadScience(!science);
    setCanUploadEnglish(englishUploadCount < maxEnglishUploads);
  }, [math, science, englishUploadCount]);

  /* ================= 업로드 함수 ================= */
  const upload = async (
    col: string,
    data: any,
    setter: any,
    reset: any,
    show: any,
    hide: any
  ) => {
    const payload = { ...data, date: Timestamp.now() };
    await addDoc(collection(db, col), payload);
    setter(payload);
    show(true);
    hide(false);
    reset();

    // 업로드 후 버튼 비활성화
    if(col === 'mathFormulas') setCanUploadMath(false);
    if(col === 'scienceConcepts') setCanUploadScience(false);
    if(col === 'englishWords') setEnglishUploadCount(prev => prev + 1);
  };

  const Section = ({ title, children }: any) => (
    <section className="rounded-3xl bg-white/80 backdrop-blur p-6 shadow-lg space-y-3 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-700">{title}</h2>
      {children}
    </section>
  );

  const Btn = ({ text, onClick, color, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2 text-sm font-semibold shadow
        ${color} hover:scale-105 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {text}
    </button>
  );

  const Card = ({ children }: any) => (
    <div className="rounded-xl bg-white p-4 shadow-inner max-w-md w-full mx-auto">
      {children}
    </div>
  );

  return (
    <PageContainer>
      <div className="flex flex-col w-full min-h-full">
          <div className="flex-1">
            <h1 className="text-[2rem] text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
              Upload a formula.
            </h1>
            <HamburgerMenu />

            <h1 className="text-lg text-orange-900 dark:text-white ml-11 mt-5 w-full text-left">
             Share a formula, boost your knowledge.
            </h1>
</div>

        {/* 수학 */}
        <Section title="📐 수학">
          <div className="flex flex-wrap gap-3 justify-center">
            <Btn text="오늘의 공식" color="bg-red-100" onClick={() => setShowMath(!showMath)} />
            <Btn
              text="공식 업로드"
              color="bg-yellow-200"
              onClick={() => setShowMathUpload(!showMathUpload)}
              disabled={!canUploadMath}
            />
          </div>
          

          {showMath && (
            <Card>
              {math ? (
                <>
                  <h3 className="font-bold text-lg">{math.title}</h3>
                  <p className="mt-1">📌 {math.formula}</p>
                  <p className="text-gray-600">{math.description}</p>
                  <p className="text-sm text-gray-400">{math.example}</p>
                </>
              ) : (
                <p className="text-gray-400">오늘의 공식 없음</p>
              )}
            </Card>
          )}

          {showMathUpload && (
            <Card>
              {['title', 'formula', 'description', 'example'].map(key => (
                <input
                  key={key}
                  placeholder={key}
                  className="w-full mb-2 rounded-lg border px-3 py-2"
                  value={(mathInput as any)[key]}
                  onChange={e => setMathInput({ ...mathInput, [key]: e.target.value })}
                />
              ))}
              <Btn
                text="업로드"
                color="bg-orange-200"
                onClick={() =>
                  upload(
                    'mathFormulas',
                    mathInput,
                    setMath,
                    () => setMathInput({ title: '', formula: '', description: '', example: '' }),
                    setShowMath,
                    setShowMathUpload
                  )
                }
              />
            </Card>
          )}
        </Section>

        {/* 과학 */}
        <Section title="🔬 과학">
          <div className="flex gap-3 justify-center">
            <Btn text="오늘의 개념" color="bg-violet-200" onClick={() => setShowScience(!showScience)} />
            <Btn
              text="개념 업로드"
              color="bg-purple-100"
              onClick={() => setShowScienceUpload(!showScienceUpload)}
              disabled={!canUploadScience}
            />
          </div>

          {showScience && science && (
            <Card>
              <h3 className="font-bold">{science.title}</h3>
              <p>{science.description}</p>
              <p className="text-sm text-gray-400">{science.example}</p>
            </Card>
          )}

          {showScienceUpload && (
            <Card>
              {['title', 'description', 'example'].map(key => (
                <input
                  key={key}
                  placeholder={key}
                  className="w-full mb-2 rounded-lg border px-3 py-2"
                  value={(scienceInput as any)[key]}
                  onChange={e => setScienceInput({ ...scienceInput, [key]: e.target.value })}
                />
              ))}
              <Btn
                text="업로드"
                color="bg-indigo-100"
                onClick={() =>
                  upload(
                    'scienceConcepts',
                    scienceInput,
                    setScience,
                    () => setScienceInput({ title: '', description: '', example: '' }),
                    setShowScience,
                    setShowScienceUpload
                  )
                }
              />
            </Card>
          )}
        </Section>

        {/* 영어 */}
        <Section title="📖 영어">
          <div className="flex gap-3 justify-center">
            <Btn text="오늘의 단어" color="bg-sky-200" onClick={() => setShowEnglish(!showEnglish)} />
            <Btn
              text="단어 업로드"
              color="bg-emerald-200"
              onClick={() => setShowEnglishUpload(!showEnglishUpload)}
              disabled={englishUploadCount >= maxEnglishUploads}
            />
          </div>

          {showEnglish && english && (
            <Card>
              <h3 className="font-bold">{english.word}</h3>
              <p>{english.meaning}</p>
              <p className="text-sm text-gray-400">{english.example}</p>
            </Card>
          )}

          {showEnglishUpload && (
            <Card>
              {['word', 'meaning', 'example'].map(key => (
                <input
                  key={key}
                  placeholder={key}
                  className="w-full mb-2 rounded-lg border px-3 py-2"
                  value={(englishInput as any)[key]}
                  onChange={e => setEnglishInput({ ...englishInput, [key]: e.target.value })}
                />
              ))}
              <Btn
                text="업로드"
                color="bg-emerald-300"
                onClick={() =>
                  upload(
                    'englishWords',
                    englishInput,
                    setEnglish,
                    () => setEnglishInput({ word: '', meaning: '', example: '' }),
                    setShowEnglish,
                    setShowEnglishUpload
                  )
                }
              />
            </Card>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
