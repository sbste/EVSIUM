/**
 * Bookings JavaScript file
 * Handles booking-related functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeBookingForm();
    setupBookingCancellation();
});

/**
 * Initialize the booking form
 */
function initializeBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;

    const stationSelect = document.getElementById('station-id');
    const chargingPointSelect = document.getElementById('charging-point-id');
    const dateInput = document.getElementById('booking-date');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const submitButton = document.querySelector('#booking-form button[type="submit"]');

    if (stationSelect) {
        stationSelect.addEventListener('change', async function() {
            const stationId = this.value;
            if (!stationId) return;

            // Clear and disable charging point select
            if (chargingPointSelect) {
                chargingPointSelect.innerHTML = '<option value="">Select a charging point</option>';
                chargingPointSelect.disabled = true;
            }

            // Clear time inputs
            if (startTimeInput) startTimeInput.value = '';
            if (endTimeInput) endTimeInput.value = '';
            if (submitButton) submitButton.disabled = true;

            try {
                // Show loading state
                const loadingElement = document.createElement('div');
                loadingElement.className = 'loading-indicator';
                loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading charging points...';
                bookingForm.insertBefore(loadingElement, chargingPointSelect.parentNode.nextSibling);

                // Fetch available charging points for this station
                const response = await fetch(`/api/stations/${stationId}/charging-points`);
                if (!response.ok) throw new Error('Failed to fetch charging points');

                const chargingPoints = await response.json();

                // Remove loading indicator
                loadingElement.remove();

                // Populate charging points dropdown
                if (chargingPointSelect) {
                    chargingPoints.forEach(point => {
                        const option = document.createElement('option');
                        option.value = point.charging_point_id;
                        option.textContent = `Point #${point.charging_point_id} (${point.slots_num} slots)`;
                        chargingPointSelect.appendChild(option);
                    });

                    chargingPointSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error fetching charging points:', error);

                // Fallback to mock data in case of API error
                const mockChargingPoints = [
                    { charging_point_id: 1, slots_num: 2 },
                    { charging_point_id: 2, slots_num: 2 },
                    { charging_point_id: 3, slots_num: 2 },
                    { charging_point_id: 4, slots_num: 2 },
                    { charging_point_id: 5, slots_num: 2 }
                ];

                // Populate charging points dropdown with mock data
                if (chargingPointSelect) {
                    mockChargingPoints.forEach(point => {
                        const option = document.createElement('option');
                        option.value = point.charging_point_id;
                        option.textContent = `Point #${point.charging_point_id} (${point.slots_num} slots)`;
                        chargingPointSelect.appendChild(option);
                    });

                    chargingPointSelect.disabled = false;
                }
            }
        });

        // Trigger change event if station is pre-selected
        if (stationSelect.value) {
            stationSelect.dispatchEvent(new Event('change'));
        }
    }

    // Handle form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate all required fields
            const requiredFields = [
                stationSelect,
                chargingPointSelect,
                dateInput,
                startTimeInput,
                endTimeInput
            ];

            let isValid = true;

            requiredFields.forEach(field => {
                if (!field || !field.value) {
                    isValid = false;
                    if (field) {
                        field.classList.add('is-invalid');
                    }
                } else {
                    if (field) {
                        field.classList.remove('is-invalid');
                    }
                }
            });

            // Validate time range
            if (startTimeInput.value && endTimeInput.value) {
                const startTime = new Date(`2000-01-01 ${startTimeInput.value}`);
                const endTime = new Date(`2000-01-01 ${endTimeInput.value}`);

                if (endTime <= startTime) {
                    isValid = false;
                    endTimeInput.classList.add('is-invalid');
                    showNotification('End time must be after start time', 'error');
                    return;
                }
            }

            if (!isValid) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            // If all valid, submit the form
            bookingForm.submit();
        });
    }
}

/**
 * Set up booking cancellation
 */
function setupBookingCancellation() {
    const cancelButtons = document.querySelectorAll('.cancel-booking-btn');
    if (cancelButtons.length === 0) return;

    cancelButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const bookingId = this.dataset.bookingId;
            const bookingDate = this.dataset.bookingDate;
            const bookingTime = this.dataset.bookingTime;

            if (confirm(`Are you sure you want to cancel your booking for ${bookingDate} at ${bookingTime}?`)) {
                // Show loading state
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
                this.disabled = true;

                // Submit cancellation request
                fetch(`/api/bookings/${bookingId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const bookingElement = this.closest('.booking-item') || this.closest('tr');
                            if (bookingElement) {
                                bookingElement.style.opacity = '0.5';
                                bookingElement.style.textDecoration = 'line-through';
                                this.innerHTML = 'Cancelled';
                            }
                            showNotification('Booking has been successfully cancelled', 'success');
                        } else {
                            throw new Error(data.message || 'Failed to cancel booking');
                        }
                    })
                    .catch(error => {
                        console.error('Error cancelling booking:', error);
                        this.innerHTML = '<i class="fas fa-times"></i> Cancel';
                        this.disabled = false;
                        showNotification('Failed to cancel booking. Please try again.', 'error');
                    });
            }
        });
    });
}

/**
 * Display a notification
 *
 * @param {string} message Notification message
 * @param {string} type Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;

    // Add notification to the page
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(notification, container.firstChild);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}