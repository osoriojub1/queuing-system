export async function sendSMS(phoneNumber: string, message: string) {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
        console.error('Textbee API key or Device ID is missing');
        return { success: false, message: 'SMS configuration missing' };
    }

    console.log(`[SMS DEBUG] Attempting to send SMS to ${phoneNumber}`);
    console.log(`[SMS DEBUG] Message: ${message}`);

    try {
        const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                recipients: [phoneNumber],
                message: message,
            }),
        });

        const data = await response.json();
        console.log('[SMS DEBUG] Textbee Response:', data);

        if (!response.ok) {
            console.error('[SMS DEBUG] Textbee API error:', data);
            return { success: false, message: data.message || 'Failed to send SMS' };
        }

        console.log('[SMS DEBUG] SMS sent successfully');
        return { success: true, data };
    } catch (error: any) {
        console.error('[SMS DEBUG] SMS sending error:', error?.message || error);
        return { success: false, message: 'Internal error sending SMS' };
    }
}
