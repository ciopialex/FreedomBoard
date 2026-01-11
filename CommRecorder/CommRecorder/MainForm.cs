using System;

using System.Windows.Forms;
using System.IO.Ports;
using System.Threading;


namespace CommRecorder
{
    public partial class MainForm : Form
    {
       
        static SerialPort _serialPort;
        Thread readThread = null;
        static System.IO.StreamWriter file;
        static int count;
        static volatile bool finished;
        static volatile bool run;
        static volatile bool portOpen;
        static int n_samples;
        static int n_ch;

        public MainForm()
        {
            InitializeComponent();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            portOpen = false;
            if(readThread != null)
                readThread.Join();
            if (_serialPort != null && _serialPort.IsOpen)
            {
                _serialPort.Close();
            }
            textBox5.Text = "Disconnected";
        }

        private void button1_Click(object sender, EventArgs e)
        {
            readThread = new Thread(Read);

            // Create a new SerialPort object with default settings.
            try
            {
                string com = textBox2.Text;
                int baud = Int32.Parse(textBox3.Text);

                _serialPort = new SerialPort(com, baud);

                // Allow the user to set the appropriate properties.

                // Set the read/write timeouts
                _serialPort.ReadTimeout = 15000;
                _serialPort.WriteTimeout = 500;

                _serialPort.Open();
                portOpen = true;
                readThread.Start();
                textBox5.Text = "Connected";
            } catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(ex.ToString());
            }
        }

        public static void Read()
        {
            byte[] buffer = new byte[100];
            System.Collections.ArrayList buff = new System.Collections.ArrayList();
            while (portOpen)
            {
                Thread.Sleep(1000);
                if (run)
                {
                    run = false;
                    while (true)
                    {
                        try
                        {
                            int cnt = _serialPort.Read(buffer, 0, 60);
                            for (int i = 0; i < cnt; i++)
                                buff.Add(buffer[i]);
                            count += cnt;
                            if (count >= n_samples * 2)
                            {
                                string str = "";

                                for (int i = 0; i < buff.Count / 2; i++)
                                {
                                    byte[] tempByteArray = new byte[2] { (byte)buff[i * 2], (byte)buff[i * 2 + 1] };
                                    short num = BitConverter.ToInt16(tempByteArray, 0);
                                    str += num;

                                    if (i % n_ch == n_ch - 1)
                                    {
                                        file.WriteLine(str);
                                        str = "";
                                    }
                                    else
                                    {
                                        str += ",";
                                    }

                                }
                                file.Close();
                                count = 0;
                                buff.Clear();
                                finished = true;
                                break;
                            }

                        }
                        catch (TimeoutException) { }
                    }
                }
            }
        }

        private void button3_Click(object sender, EventArgs e)
        {
            try
            {
                textBox1.AppendText("Recording ... ");
                textBox1.AppendText(Environment.NewLine);
                file = new System.IO.StreamWriter(textBox6.Text);
                count = 0;
                n_samples = Int32.Parse(textBox4.Text);
                if (radioButton1.Checked)
                    n_ch = 1;
                else if (radioButton2.Checked)
                    n_ch = 2;
                else
                    n_ch = 3;
                _serialPort.Write("R");
                finished = false;
                run = true;
            } catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(ex.ToString());
            }
        }

        private void MainForm_Load(object sender, EventArgs e)
        {

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            if(finished)
            {
                textBox1.AppendText("Finished.");
                textBox1.AppendText(Environment.NewLine);
                finished = false;
            }
        }

        private void textBox5_TextChanged(object sender, EventArgs e)
        {

        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (readThread != null)
                readThread.Join();
            if (_serialPort != null && _serialPort.IsOpen)
                _serialPort.Close();
            textBox5.Text = "Disconnected";
        }
    }
}
