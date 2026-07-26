const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 2525,
  auth: {
    user: process.env.SMTP2GO_USERNAME,
    pass: process.env.SMTP2GO_PASSWORD,
  },
});

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
        const mailOptions = {
          from: parsed.from?.text || process.env.DEFAULT_FROM,
          to: parsed.to?.text || '',
          subject: parsed.subject || '(no subject)',
          text: parsed.text || '',
          html: parsed.html || undefined,
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Sent via SMTP2GO:', result.messageId);
        callback();
      } catch (sendErr) {
        console.error('SMTP2GO error:', sendErr);
        callback(sendErr);
      }
    });
  },
});

const PORT = process.env.PORT || 2525;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SMTP bridge listening on port ${PORT}`);
});