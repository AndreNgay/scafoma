import { TextInputProps } from 'react-native'

export type PasswordInputOverrides = Pick<
	TextInputProps,
	'textContentType' | 'autoComplete'
>

const basePasswordInputProps: TextInputProps = {
	secureTextEntry: true,
	contextMenuHidden: true,
	selectTextOnFocus: false,
	autoCapitalize: 'none',
	autoCorrect: false,
	keyboardType: 'default',
	importantForAutofill: 'no',
	textContentType: 'password',
	autoComplete: 'password',
}

export const getPasswordInputProps = (
	overrides?: PasswordInputOverrides
): TextInputProps => ({
	...basePasswordInputProps,
	...overrides,
})

// Helper to prevent paste by checking value changes
export const preventPaste = (newValue: string, oldValue: string): string => {
	// If the new value length is significantly longer than old value + 1 character,
	// it's likely a paste operation
	if (newValue.length > oldValue.length + 1) {
		return oldValue // Reject the paste
	}
	return newValue // Allow normal typing
}
