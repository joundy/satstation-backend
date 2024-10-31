import { OpCodes } from "./const";

type OpCodeKeys = keyof typeof OpCodes;
type OpCodeValues = (typeof OpCodes)[OpCodeKeys];

export type StackElement = Buffer | OpCodeValues | number;
export type StackScripts = StackElement[];
