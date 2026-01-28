using Microsoft.AspNetCore.Mvc;

namespace pingpong.Controllers
{
    public class GameController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
