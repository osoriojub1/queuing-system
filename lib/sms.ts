export async function sendSMS(phoneNumber: string, message: string) {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
        console.error('Textbee API key or Device ID is missing');
        return { success: false, message: 'SMS configuration missing' };
    }

    try {
        const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                phone: phoneNumber,
                message: message,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Textbee API error:', data);
            return { success: false, message: data.message || 'Failed to send SMS' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('SMS sending error:', error);
        return { success: false, message: 'Internal error sending SMS' };
    }
}
