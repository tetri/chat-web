"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

type UserProfile = {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
};

type Message = {
    id: string;
    user: UserProfile;
    content: string;
    createdAt: any;
    replyToId?: string;
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [user, setUser] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // 🔑 Verifica autenticação
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) {
                router.push("/"); // volta pra home se não logado
            } else {
                setUser(u);
            }
        });
        return () => unsub();
    }, [router]);

    // Listener de mensagens
    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(
                snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() } as Message)
                )
            );
        });
        return () => unsubscribe();
    }, []);

    // Scroll automático para última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function sendMessage() {
        if (!text || !user) return;
        await addDoc(collection(db, "messages"), {
            user: {
                uid: user.uid,
                displayName: user.displayName || user.email,
                photoURL: user.photoURL,
            },
            content: text,
            createdAt: new Date(),
            replyToId: replyTo?.id || null,
        });
        setText("");
        setReplyTo(null);
    }

    function logout() {
        signOut(auth);
    }

    // Encontra mensagem pai
    const getParentMessage = (msg: Message) =>
        messages.find((m) => m.id === msg.replyToId);

    // Agrupa mensagens por dia
    const groupByDate = (msgs: Message[]) => {
        const groups: { [date: string]: Message[] } = {};
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const todayString = today.toDateString();
        const yesterdayString = yesterday.toDateString();

        msgs.forEach((m) => {
            const d = new Date(m.createdAt.toDate());
            const dString = d.toDateString();
            let key: string;

            if (dString === todayString) {
                key = "Hoje";
            } else if (dString === yesterdayString) {
                key = "Ontem";
            } else {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0'); // O mês começa em 0
                const year = d.getFullYear();
                key = `${day}/${month}/${year}`;
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    };

    const groupedMessages = groupByDate(messages);

    if (!user) {
        return null; // evita piscar conteúdo antes do redirect
    }

    return (
        <div className="mx-auto m-10 space-y-4 max-w-3xl">
            {/* Usuário logado */}
            <div className="text-center mb-2 p-2 bg-gray-100 rounded-lg text-sm font-medium flex justify-between items-center gap-2">
                <span>
                    <span className="font-bold">
                        {user.displayName || user.email}
                    </span>
                </span>
                <button
                    onClick={logout}
                    className="text-red-500 underline text-xs"
                >
                    Sair
                </button>
            </div>

            {/* Lista de mensagens */}
            <ScrollArea className="h-[70vh] overflow-y-auto flex flex-col gap-4 p-4 rounded-md border">
                {Object.keys(groupedMessages).map((date) => (
                    <div key={date}>
                        {/* Separador de dia */}
                        <div className="text-center text-xs text-gray-400 my-2">
                            {date}
                        </div>

                        {groupedMessages[date].map((m) => {
                            const isOwn = user.uid === m.user.uid;
                            const parent = getParentMessage(m);
                            const time = new Date(m.createdAt.toDate()).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                            );

                            const userName = m.user.displayName || m.user || "Guest";
                            const avatarImage = m.user.photoURL || undefined;
                            const avatarFallback = userName[0].toUpperCase();

                            return (
                                <div
                                    key={m.id}
                                    className={`mb-1 flex items-end gap-2 ${isOwn ? "self-end flex-row-reverse" : "self-start"
                                        }`}
                                >
                                    <Avatar className="size-10">
                                        <AvatarImage src={avatarImage} />
                                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div
                                        className={`flex flex-col p-2 rounded-xl text-sm break-words ${isOwn
                                            ? "bg-green-500 text-white rounded-br-none"
                                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                                            }`}
                                        onClick={() => setReplyTo(m)}
                                        title="Clique para responder"
                                    >
                                        {!isOwn && <div className="font-bold text-xs text-green-500">{userName}</div>}
                                        {parent && (
                                            <div className={`border-l-5  px-2 py-1 mb-1 rounded-l-lg rounded-r-lg text-xs ${isOwn
                                                ? "bg-green-600 border-l-green-700 text-white rounded-br-none"
                                                : "bg-gray-300 border-l-gray-400 text-gray-800 rounded-bl-none"
                                                }`}>
                                                <div className="font-bold">{parent.user.displayName || parent.user || "Guest"}</div>
                                                <div>{parent.content}</div>
                                            </div>
                                        )}                                            {m.content}
                                        <div className={`pl-2 text-xs mt-0.5 self-end ${isOwn
                                            ? "text-green-300"
                                            : "text-gray-500"
                                            }`}>{time}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="flex flex-col gap-1">
                {replyTo && (
                    <div className="bg-gray-100 p-2 rounded-lg text-sm flex justify-between items-center">
                        Respondendo a <b>{replyTo.user.displayName}</b>: {replyTo.content}
                        <button
                            onClick={() => setReplyTo(null)}
                            className="text-red-500 ml-2"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <Input
                        className="rounded-full"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Digite uma mensagem..."
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage}
                        className="rounded-full bg-green-700">
                        <SendIcon className="h-5 w-5" /> Enviar
                    </Button>
                </div>
            </div>
        </div>
    );
}
