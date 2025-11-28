import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useThemeContext } from '../../../context'
import { useResponsiveDimensions } from '../../../hooks'
import { createCustomerMenuStyles } from '../../../styles/customer'
import ConcessionCard from './ConcessionCard'
import type { CafeteriaWithConcessions } from '../../../types'

interface CafeteriaSectionProps {
	cafeteria: CafeteriaWithConcessions
}

const CafeteriaSection: React.FC<CafeteriaSectionProps> = ({ cafeteria }) => {
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const styles = createCustomerMenuStyles(colors, responsive)
	const [showClosedConcessions, setShowClosedConcessions] = useState(false)

	// Separate open and closed concessions
	const openConcessions = cafeteria.concessions.filter((c) => c.is_open)
	const closedConcessions = cafeteria.concessions.filter((c) => !c.is_open)

	return (
		<View style={styles.cafeteriaSection}>
			<View style={styles.cafeteriaHeader}>
				<Text style={styles.cafeteriaName}>Cafeteria: {cafeteria.name}</Text>
				{cafeteria.location && (
					<Text style={styles.cafeteriaLocation}>{cafeteria.location}</Text>
				)}
			</View>

			{/* No concessions message */}
			{cafeteria.concessions.length === 0 && (
				<View style={styles.emptyStateContainer}>
					<Text style={styles.emptyStateText}>
						No concessions available for this cafeteria
					</Text>
				</View>
			)}

			{/* No open concessions message */}
			{cafeteria.concessions.length > 0 && openConcessions.length === 0 && (
				<View style={styles.emptyStateContainer}>
					<Text style={styles.emptyStateText}>
						No open concessions at the moment
					</Text>
				</View>
			)}

			{/* Open Concessions */}
			{openConcessions.map((concession) => (
				<ConcessionCard
					key={concession.id}
					concession={concession}
				/>
			))}

			{/* Closed Concessions Section */}
			{closedConcessions.length > 0 && (
				<View style={styles.closedConcessionsSection}>
					<TouchableOpacity
						style={styles.closedConcessionsHeader}
						onPress={() => setShowClosedConcessions(!showClosedConcessions)}>
						<Text style={styles.closedConcessionsTitle}>
							Closed concessions: ({closedConcessions.length})
						</Text>
						<MaterialCommunityIcons
							name={showClosedConcessions ? 'chevron-up' : 'chevron-down'}
							size={24}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>

					{showClosedConcessions &&
						closedConcessions.map((concession) => (
							<ConcessionCard
								key={concession.id}
								concession={concession}
							/>
						))}
				</View>
			)}

			{/* Divider at bottom of cafeteria section */}
			<View style={styles.cafeteriaDivider} />
		</View>
	)
}

export default CafeteriaSection
