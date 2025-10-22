"use client";
import { useState } from "react";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  const sendQuery = async () => {
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      body: new URLSearchParams({ user_id: "<current_user_id>", query }),
    });
    const data = await res.json();
    setAnswer(data.answer);
  };

  return (
    <div className="p-6">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about your uploaded files..."
        className="w-full border p-2"
      />
      <button onClick={sendQuery} className="mt-2 bg-blue-500 text-white p-2 rounded">
        Ask
      </button>
      {answer && <p className="mt-4 bg-gray-100 p-3">{answer}</p>}
    </div>
  );
}
