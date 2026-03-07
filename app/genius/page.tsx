"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

type Message = {
  id: string;
  user: string;
  content: string;
  createdAt?: any;
  readBy?: string[];
};

type Room = {
  id: string;
  name: string;
  members: string[];
};

export default function Chat(){

const [nickname,setNickname]=useState<string|null>(null)
const [rooms,setRooms]=useState<Room[]>([])
const [currentRoomId,setCurrentRoomId]=useState<string|null>(null)
const [messages,setMessages]=useState<Message[]>([])
const [input,setInput]=useState("")
const [selectedMessageId,setSelectedMessageId]=useState<string|null>(null)

const messagesEndRef=useRef<HTMLDivElement|null>(null)

/* 날짜 */
const formatDate=(ts:any)=>{
 if(!ts)return ""
 const d=ts?.toDate?ts.toDate():new Date(ts)
 return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`
}

/* 시간 */
const formatTime=(ts:any)=>{
 if(!ts)return ""
 const d=ts?.toDate?ts.toDate():new Date(ts)
 return d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})
}

/* 로그인 */
useEffect(()=>{
 const unsub=watchAuthState(user=>{
  if(user)setNickname(user.displayName||"유저")
 })
 return ()=>unsub()
},[])

/* 방 목록 */
useEffect(()=>{
 const q=query(collection(db,"rooms"))
 const unsub=onSnapshot(q,snap=>{
  const r:Room[]=snap.docs.map(d=>({
   id:d.id,
   name:d.data().name,
   members:d.data().members||[]
  }))
  setRooms(r)
 })
 return ()=>unsub()
},[])

/* 메시지 */
useEffect(()=>{

 if(!currentRoomId) return

 const q=query(
  collection(db,"rooms",currentRoomId,"messages"),
  orderBy("createdAt","asc")
 )

 const unsub=onSnapshot(q,snap=>{

  const msgs=snap.docs.map(d=>({
   id:d.id,
   user:d.data().user,
   content:d.data().content,
   createdAt:d.data().createdAt,
   readBy:d.data().readBy||[]
  }))

  setMessages(msgs)

  msgs.forEach(markAsRead)

  setTimeout(()=>{
   messagesEndRef.current?.scrollIntoView({behavior:"smooth"})
  },50)

 })

 return ()=>unsub()

},[currentRoomId])

/* 읽음 처리 */
const markAsRead=async(msg:Message)=>{

 if(!nickname||!currentRoomId) return

 if(msg.readBy?.includes(nickname)) return

 await updateDoc(
  doc(db,"rooms",currentRoomId,"messages",msg.id),
  {
   readBy:[...(msg.readBy||[]),nickname]
  }
 )

}

/* 메시지 보내기 */
const sendMessage=async()=>{

 if(!input.trim()||!nickname||!currentRoomId)return

 await addDoc(
  collection(db,"rooms",currentRoomId,"messages"),
  {
   user:nickname,
   content:input.trim(),
   createdAt:serverTimestamp(),
   readBy:[nickname]
  }
 )

 setInput("")

}

/* 메시지 삭제 */
const deleteMessage=async(msg:Message)=>{
 if(!currentRoomId)return
 await deleteDoc(doc(db,"rooms",currentRoomId,"messages",msg.id))
 setSelectedMessageId(null)
}

/* 방 만들기 */
const createRoom=async()=>{

 if(!nickname)return

 const name=prompt("방 이름")
 if(!name)return

 await addDoc(collection(db,"rooms"),{
  name,
  members:[nickname]
 })

}

/* 초대 */
const inviteUser=async(room:Room)=>{

 const name=prompt("초대할 닉네임")
 if(!name)return

 if(room.members.includes(name)){
  alert("이미 방 이용중!")
  return
 }

 await updateDoc(doc(db,"rooms",room.id),{
  members:[...room.members,name]
 })

}

/* 탈퇴 */
const leaveRoom=async(room:Room)=>{

 if(!nickname)return

 const newMembers=room.members.filter(m=>m!==nickname)

 await updateDoc(doc(db,"rooms",room.id),{
  members:newMembers
 })

 if(currentRoomId===room.id){
  setCurrentRoomId(null)
 }

}

if(!nickname)return<div>로딩중...</div>

return(

<div className="flex h-screen">

{/* 사이드바 */}

<div className="w-60 border-r p-4 flex flex-col gap-2">

<div className="font-bold">채팅방</div>

<button
className="bg-yellow-200 p-2 rounded"
onClick={createRoom}
>
새 방 만들기
</button>

{rooms
.filter(r=>r.members.includes(nickname))
.map(r=>(

<div
key={r.id}
className={`p-2 rounded cursor-pointer ${
 r.id===currentRoomId
 ? "bg-gray-300"
 : "hover:bg-gray-200"
}`}
onClick={()=>setCurrentRoomId(r.id)}
onDoubleClick={()=>{
 const action=prompt("초대 / 탈퇴")
 if(action==="초대")inviteUser(r)
 if(action==="탈퇴")leaveRoom(r)
}}
>

{r.name}

</div>

))}

</div>

{/* 채팅 */}

<div className="flex-1 flex flex-col">

<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">

{messages.map((m,i)=>{

const prev=messages[i-1]

const showDate=!prev||formatDate(prev.createdAt)!==formatDate(m.createdAt)
const showUser=!prev||prev.user!==m.user

const room=rooms.find(r=>r.id===currentRoomId)


return(

<div key={m.id} className="flex flex-col">

{showDate&&(
<div className="text-center text-xs text-gray-400 my-4">
───── {formatDate(m.createdAt)} ─────
</div>
)}

{m.user==="system"?(

<div className="text-center text-xs text-gray-400">
system : {m.content}
</div>

):( 

<div
className={`flex flex-col max-w-xs ${
 m.user===nickname
 ?"self-end items-end"
 :"self-start items-start"
}`}
onClick={()=>m.user===nickname&&setSelectedMessageId(m.id)}
>

{showUser&&(
<div className="text-xs text-gray-500 mb-1">
{m.user}
</div>
)}

<div
className={`px-3 py-2 rounded-2xl ${
 m.user===nickname
 ?"bg-red-100"
 :"bg-gray-200"
}`}
>
{m.content}
</div>

<div className="flex gap-1 text-[10px] text-gray-400">



<span>
{formatTime(m.createdAt)}
</span>

</div>

</div>

)}

</div>

)

})}

<div ref={messagesEndRef}/>

</div>

{/* 입력 */}

<div className="flex border-t p-3 gap-2">

<input
className="flex-1 border rounded-xl px-3 py-2"
value={input}
onChange={e=>setInput(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&sendMessage()}
placeholder="메시지 입력"
/>

<button
className="px-4 py-2 bg-yellow-200 rounded-xl"
onClick={sendMessage}
>
전송
</button>

</div>

</div>

</div>

)

}