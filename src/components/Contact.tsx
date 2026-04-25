import { Coffee, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Contact = () => {
  const contactInfo = [
    {
      title: "Visit Us",
      details: ["Al Banafsaj St. Hazza Bin Zayed Stadium", "Bldg. 15 - Al Tiwayya - Abu Dhabi", "United Arab Emirates"],
      icon: MapPin
    },
    {
      title: "Call Us",
      details: ["037 800 030", "050 658 4176", "Sun–Thu: 6:30 AM–12 AM | Fri–Sat: 7 AM–1 AM"],
      icon: Phone
    },
    {
      title: "Email Us",
      details: ["nawacafe22@gmail.com"],
      icon: Mail
    }
  ];

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Information */}
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <Card
                key={index}
                className="border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-11 h-11 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                      <info.icon className="w-5 h-5 text-coffee-600" />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-lg font-semibold text-card-foreground mb-2">
                        {info.title}
                      </h3>
                      {info.details.map((detail, idx) => (
                        <p key={idx} className="text-muted-foreground text-sm leading-relaxed">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Map and Hours */}
          <div className="space-y-8">
            <Card className="border-border bg-card shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-cinzel text-2xl font-bold text-card-foreground mb-4">
                  Opening Hours
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sunday – Thursday</span>
                    <span className="font-semibold text-card-foreground">6:30 AM - 12:00 AM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Friday – Saturday</span>
                    <span className="font-semibold text-card-foreground">7:00 AM - 1:00 AM</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button className="bg-coffee-600 hover:bg-coffee-700 text-white px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <Coffee className="w-5 h-5 mr-2" />
                Order for Pickup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
