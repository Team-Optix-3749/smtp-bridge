const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onData(stream, session, callback) {
    simpleParser(stream, {}, async (err, parsed) => {
      if (err) {
        console.error('Parse error:', err);
        return callback(err);
      }

      try {
        const result = await resend.emails.send({
          from: parsed.from?.text || process.env.DEFAULT_FROM,
          to: parsed.to?.value.map(t => t.address) || [],
          subject: parsed.subject || '(no subject)',
          text: parsed.text || '',
          html: parsed.html || undefined,
        });

        console.log('Sent via Resend:', result);
        callback();
      } catch (sendErr) {
        console.error('Resend error:', sendErr);
        callback(sendErr);
      }
    });
  },
});

const PORT = process.env.PORT || 2525;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SMTP bridge listening on port ${PORT}`);
});