import { NextResponse } from "next/server";

export async function GET() {
  const pool = ["토마토","계란","버섯","닭가슴살","파프리카","치즈","감자","브로콜리"];
  const count = 3 + Math.floor(Math.random()*3);
  const ingredients: string[] = [];
  while(ingredients.length < count){
    const item = pool[Math.floor(Math.random() * pool.length)];
    if(!ingredients.includes(item)) ingredients.push(item);
  }
  return NextResponse.json({ ingredients });
}