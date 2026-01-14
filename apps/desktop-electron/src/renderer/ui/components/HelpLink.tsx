import React from "react";
import { Link } from "react-router-dom";
import Button from "./Button";

export default function HelpLink({ topicId, label = "?" }: { topicId: string; label?: string }) {
  return (
    <Link to={`/help#${topicId}`}>
      <Button variant="outline">{label}</Button>
    </Link>
  );
}
