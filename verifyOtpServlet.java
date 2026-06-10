import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class verifyOtpServlet extends HttpServlet {

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String userOtp =
        req.getParameter("otp");

        HttpSession session =
        req.getSession();

        String realOtp =
        (String) session.getAttribute("otp");

        if(userOtp.equals(realOtp)) {

            res.setContentType(
            "text/html"
            );

            PrintWriter out =
            res.getWriter();

            out.println(

            "<script>" +

            "alert('OTP Verified Successfully');" +

            "window.location='resetPassword.html';" +

            "</script>"

            );

        }

        else {

            res.getWriter().println(

            "<script>" +

            "alert('Invalid OTP');" +

            "window.location='otp.html';" +

            "</script>"

            );

        }

    }

}