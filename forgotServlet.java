import java.io.*;
import java.util.*;
import javax.servlet.*;
import javax.servlet.http.*;

import jakarta.mail.*;
import jakarta.mail.internet.*;

public class forgotServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private String extractJsonField(String json, String field) {
        if (json == null) return null;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"" + field + "\"\\s*:\\s*\"([^\"]+)\"");
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) return m.group(1);
        return null;
    }

    protected void doPost(
        HttpServletRequest req,
        HttpServletResponse res
    ) throws ServletException, IOException {

        String email = req.getParameter("email");

        if (email == null) {
            try {
                StringBuilder sb = new StringBuilder();
                BufferedReader reader = req.getReader();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                String body = sb.toString();
                email = extractJsonField(body, "email");
            } catch(Exception ignored) {}
        }

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
        "muthulakshmi2002apk@gmail.com";

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

            String acceptHeader = req.getHeader("Accept");
            String requestedWith = req.getHeader("X-Requested-With");
            boolean isAjax = (acceptHeader != null && acceptHeader.contains("application/json")) || "XMLHttpRequest".equals(requestedWith);

            if(isAjax) {
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":true,\"message\":\"OTP Sent Successfully!\",\"redirect\":\"otp.html\"}");
            } else {
                res.sendRedirect("otp.html?msg=" + java.net.URLEncoder.encode("OTP Sent Successfully", "UTF-8"));
            }
        } catch(Exception e) {
            String acceptHeader = req.getHeader("Accept");
            if (acceptHeader != null && acceptHeader.contains("application/json")) {
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":false,\"message\":\"" + e.getMessage() + "\"}");
            } else {
                res.sendRedirect("forgot.html?error=failed");
            }
        }
    }
}