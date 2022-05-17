﻿using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MultiArchApp.Models;
using System.Runtime.InteropServices;

namespace MultiArchApp.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        var arch = RuntimeInformation.OSDescription.ToString();
        Console.WriteLine(arch);
        return View(new IndexModel(arch));
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
