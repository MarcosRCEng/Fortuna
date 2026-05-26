import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export function SanitizedString(options: { max: number; optional?: boolean } = { max: 80 }) {
  const decorators = [
    IsString(),
    Transform(({ value }) => (typeof value === "string" ? value.trim() : value)),
    MinLength(1),
    MaxLength(options.max),
    Matches(/^[^<>]*$/, {
      message: "$property must not contain HTML-like characters.",
    }),
  ];

  return options.optional
    ? applyDecorators(IsOptional(), ...decorators)
    : applyDecorators(...decorators);
}
