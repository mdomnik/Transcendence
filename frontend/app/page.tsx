"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("loadinfsaasdfga...");

  useEffect(() => {
    fetch("/api/test/")
      .then((res) => res.text())
      .then(setMessage)
      .catch(() => setMessage("API error 2"));
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Frontend ↔ Bacdsaddsadaasdfsakend Testa</h1>
      <p className="mt-4">{message}</p>
    </main>
  );
}
