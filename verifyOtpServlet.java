import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class verifyOtpServlet extends HttpServlet {
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

        String userOtp = req.getParameter("otp");

        if (userOtp == null) {
            try {
                StringBuilder sb = new StringBuilder();
                BufferedReader reader = req.getReader();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                String body = sb.toString();
                userOtp = extractJsonField(body, "otp");
            } catch(Exception ignored) {}
        }

        HttpSession session =
        req.getSession();

        String realOtp =
        (String) session.getAttribute("otp");

        String acceptHeader = req.getHeader("Accept");
        String requestedWith = req.getHeader("X-Requested-With");
        boolean isAjax = (acceptHeader != null && acceptHeader.contains("application/json")) || "XMLHttpRequest".equals(requestedWith);

        if(userOtp != null && realOtp != null && userOtp.trim().equals(realOtp.trim())) {
            if(isAjax) {
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":true,\"message\":\"OTP Verified Successfully!\",\"redirect\":\"resetPassword.html\"}");
            } else {
                res.sendRedirect("resetPassword.html");
            }
        } else {
            if(isAjax) {
                res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":false,\"message\":\"Invalid or expired OTP. Please try again.\"}");
            } else {
                res.sendRedirect("otp.html?error=invalid_otp");
            }
        }
    }
}