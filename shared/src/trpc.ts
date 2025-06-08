// Context type definition (without runtime dependencies)
export type TRPCContext = {
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

// User type definition
export type User = {
  id: string;
  name: string;
  bio?: string;
};

// Input/Output type definitions for procedures
export type GetUserByIdInput = string;
export type GetUserByIdOutput = string;

export type CreateUserInput = {
  name: string;
  bio?: string;
};
export type CreateUserOutput = User;
