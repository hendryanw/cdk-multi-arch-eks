namespace MultiArchApp.Models;

public class IndexModel
{
    public string Architecture { get; set; }

    public IndexModel(string arch)
    {
      this.Architecture = arch;
    }
}
