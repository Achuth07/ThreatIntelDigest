import { useRoute } from "wouter";

export default function TestPage() {
  const [, params] = useRoute("/test/:id");
  const id = params?.id;
  
  return (
    <div>
      <h1>Test Page</h1>
      <p>ID: {id || "No ID"}</p>
    </div>
  );
}