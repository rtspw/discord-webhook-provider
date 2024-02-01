export interface StringType {
  type: 'string';
  optional?: boolean;
  restrictions?: {
    maxLength?: number;
    minLength?: number;
  }
}

export interface NumberType {
  type: 'number';
  optional?: boolean;
  restrictions?: {
    max?: number;
    min?: number;
  }
}

export interface BooleanType {
  type: 'boolean';
  optional?: boolean;
}

export interface ArrayType {
  type: 'array';
  subtype: ArgType;
}

export interface ObjectType {
  type: 'object';
  subtypes: Record<string, ArgType>;
}

export type ArgType = StringType | NumberType | BooleanType | ArrayType | ObjectType
