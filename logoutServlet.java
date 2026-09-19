import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class logoutServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        HttpSession session =
        req.getSession(false);

        if(session != null) {

            session.invalidate();

        }

        res.sendRedirect(
        "auth.html"
        );

    }

}