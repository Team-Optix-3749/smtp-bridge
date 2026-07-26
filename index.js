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
        const recipient = Array.isArray(parsed.to?.value)
          ? parsed.to.value.map((t) => t.address).join(',')
          : parsed.to?.text || '';

        const mailOptions = {
          from: process.env.DEFAULT_FROM || 'notifications@plane.team3749.com',
          to: recipient,
          subject: parsed.subject || '(no subject)',
          text: parsed.text || '',
          html: parsed.html || undefined,
        };

        console.log(`[Bridge] Relaying to SMTP2GO for recipient: ${mailOptions.to}`);
        const result = await transporter.sendMail(mailOptions);
        console.log('[Bridge] Sent via SMTP2GO! Message ID:', result.messageId);
        
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