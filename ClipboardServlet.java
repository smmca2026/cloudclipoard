import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.sql.*;

public class ClipboardServlet extends HttpServlet {

    Connection con;

    public void init() {

        try {

            Class.forName(
            "com.mysql.cj.jdbc.Driver"
            );

            con = DriverManager.getConnection(

                "jdbc:mysql://localhost:3306/cloudclipboard",

                "root",

                "Digi@2024"

            );

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

    private String extractJsonField(String json, String field) {
        if (json == null) return null;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"" + field + "\"\\s*:\\s*\"([^\"]*)\"");
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) return m.group(1).replace("\\n", "\n").replace("\\\"", "\"");
        return null;
    }

    protected void doPost(
        HttpServletRequest req,
        HttpServletResponse res
    ) throws ServletException, IOException {

        String content = req.getParameter("text");

        if (content == null) {
            try {
                StringBuilder sb = new StringBuilder();
                BufferedReader reader = req.getReader();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                String body = sb.toString();
                content = extractJsonField(body, "text");
                if (content == null && !body.isEmpty()) {
                    content = body;
                }
            } catch(Exception ignored) {}
        }

        try {
            Statement st = con.createStatement();
            st.executeUpdate("DELETE FROM clipboard");

            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO clipboard(content) VALUES(?)"
            );
            ps.setString(1, content != null ? content : "");
            ps.executeUpdate();

            String acceptHeader = req.getHeader("Accept");
            if (acceptHeader != null && acceptHeader.contains("application/json")) {
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":true,\"message\":\"Saved Successfully\"}");
            } else {
                res.getWriter().write("Saved Successfully");
            }
        } catch(Exception e) {
            e.printStackTrace();
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            res.getWriter().write("Error: " + e.getMessage());
        }
    }

    protected void doGet(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        try {

            Statement st =
            con.createStatement();

            ResultSet rs =
            st.executeQuery(
            "SELECT * FROM clipboard ORDER BY id DESC LIMIT 1"
            );

            PrintWriter out =
            res.getWriter();

            if(rs.next()) {

                out.print(
                rs.getString("content")
                );

            }

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

}