import { TextInputProps } from "react-native";

export type PasswordInputOverrides = Pick<
  TextInputProps,
  "textContentType" | "autoComplete"
>;

const basePasswordInputProps: TextInputProps = {
  secureTextEntry: true,
  contextMenuHidden: true,
  selectTextOnFocus: false,
  autoCapitalize: "none",
  autoCorrect: false,
  keyboardType: "default",
  importantForAutofill: "no",
  textContentType: "password",
  autoComplete: "password",
};

export const getPasswordInputProps = (
  overrides?: PasswordInputOverrides
): TextInputProps => ({
  ...basePasswordInputProps,
  ...overrides,
});
