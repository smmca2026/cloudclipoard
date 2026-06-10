import java.io.*;
import java.util.*;
import javax.servlet.*;
import javax.servlet.http.*;

import jakarta.mail.*;
import jakarta.mail.internet.*;

public class forgotServlet extends HttpServlet {

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String email =
        req.getParameter("email");

        // GENERATE OTP
        Random rand =
        new Random();

        int otp =
        100000 + rand.nextInt(900000);

        // SAVE OTP IN SESSION
        HttpSession session =
        req.getSession();

        session.setAttribute(
            "otp",
            String.valueOf(otp)
        );

        session.setAttribute(
            "email",
            email
        );

        // YOUR GMAIL
        String from =
        "muthulakshmi2002apk@gmail";

        // APP PASSWORD
        String password =
        "fnvppswbzvbdapix";

        // GMAIL SMTP SETTINGS
        Properties props =
        new Properties();

        props.put(
        "mail.smtp.auth",
        "true"
        );

        props.put(
        "mail.smtp.starttls.enable",
        "true"
        );

        props.put(
        "mail.smtp.host",
        "smtp.gmail.com"
        );

        props.put(
        "mail.smtp.port",
        "587"
        );

        props.put(
        "mail.smtp.ssl.protocols",
        "TLSv1.2"
        );

        // MAIL SESSION
        jakarta.mail.Session mailSession =
jakarta.mail.Session.getInstance(
            props,

            new jakarta.mail.Authenticator() {

    protected jakarta.mail.PasswordAuthentication
    getPasswordAuthentication() {

        return new
        jakarta.mail.PasswordAuthentication(

            from,
            password

        );

    }

}

        );

        try {

            // CREATE MESSAGE
            Message message =
            new MimeMessage(mailSession);

            message.setFrom(

                new InternetAddress(from)

            );

            message.setRecipients(

                Message.RecipientType.TO,

                InternetAddress.parse(email)

            );

            message.setSubject(
            "Cloud Clipboard OTP"
            );

            message.setText(

            "Your OTP is: " + otp

            );

            // SEND EMAIL
            Transport.send(message);

            res.setContentType(
            "text/html"
            );

            PrintWriter out =
            res.getWriter();

            out.println(

            "<script>" +

            "alert('OTP Sent Successfully');" +

            "window.location='otp.html';" +

            "</script>"

            );

        }

        catch(Exception e) {

            res.getWriter().println(e);

        }

    }

}