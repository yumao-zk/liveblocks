import type {
  CommentBodyElement,
  CommentBodyMention,
} from "./types/CommentBody";

export function isCommentBodyMention(
  element: CommentBodyElement
): element is CommentBodyMention {
  return "type" in element && element.type === "mention";
}