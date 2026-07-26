const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],

  onAuth(auth, session, callback) {
    console.log(`[Bridge] Incoming auth attempt from user: ${auth.username}`);
    return callback(null, { user: auth.username });
  },

  onData(stream, session, callback) {
    console.log('[Bridge] Receiving email stream from Plane...');

    simpleParser(stream, {}, async (err, parsed) => {
      if (err) {
        console.error('[Bridge] Parse error:', err);
        return callback(err);
      }

      try {
        const recipients = Array.isArray(parsed.to?.value)
          ? parsed.to.value.map((t) => t.address)
          : [parsed.to?.text].filter(Boolean);

        const payload = {
          api_key: process.env.SMTP2GO_API_KEY,
          sender: process.env.DEFAULT_FROM || 'notifications@plane.team3749.com',
          to: recipients,
          subject: parsed.subject || '(no subject)',
          text_body: parsed.text || '',
          ...(parsed.html ? { html_body: parsed.html } : {}),
        };

        console.log(`[Bridge] Relaying to SMTP2GO for recipient(s): ${recipients.join(', ')}`);

        const res = await fetch(SMTP2GO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Smtp2go-Api-Key': process.env.SMTP2GO_API_KEY,
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (!res.ok || result?.data?.failures?.length) {
          console.error('[Bridge] SMTP2GO API error:', JSON.stringify(result));
          return callback(new Error('SMTP2GO API rejected the send'));
        }

        console.log('[Bridge] Sent via SMTP2GO! request_id:', result?.data?.email_id || result?.request_id);
        callback();
      } catch (sendErr) {
        console.error('[Bridge] SMTP2GO relay error:', sendErr);
        callback(sendErr);
      }
    });
  },
});

const PORT = process.env.PORT || 2525;

server.listen(PORT, '::', () => {
  console.log(`SMTP bridge listening on port ${PORT}`);
});