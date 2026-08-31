import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FriendAvatar } from '@/components/common/FriendAvatar'

describe('FriendAvatar', () => {
	it('renders a fallback for a missing display name', () => {
		render(<FriendAvatar displayName={null} />)

		expect(screen.getByText('UU')).toBeInTheDocument()
	})
})
