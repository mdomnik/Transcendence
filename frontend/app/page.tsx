"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("loading...");

  useEffect(() => {
    fetch("http://localhost:3000/health")
      .then((res) => res.text())
      .then(setMessage)
      .catch(() => setMessage("API error"));
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Frontend ↔ Backend Test</h1>
      <p className="mt-4">{message}</p>
    </main>
  );
}
