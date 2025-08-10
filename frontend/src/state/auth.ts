import { atom } from "jotai";
export const tokenAtom = atom<string | null>(localStorage.getItem("token"));
export const userAtom = atom<{ id:string; email:string } | null>(null);
