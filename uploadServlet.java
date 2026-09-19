import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.MultipartConfig;

@MultipartConfig
public class uploadServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doPost(
        HttpServletRequest req,
        HttpServletResponse res
    ) throws ServletException, IOException {

        Part filePart =
        req.getPart("file");

        String fileName =
        filePart.getSubmittedFileName();

        String uploadPath =
        "C:/uploads";

        File uploadDir =
        new File(uploadPath);

        if(!uploadDir.exists()) {

            uploadDir.mkdirs();

        }

        filePart.write(
            uploadPath
            + File.separator
            + fileName
        );

        // Save latest filename

        String projectPath =
        getServletContext()
        .getRealPath("");

        FileWriter fw =
        new FileWriter(
        projectPath +
        "latest.txt");

        fw.write(fileName);

        fw.close();

        res.getWriter()
        .write("success");
    }
}