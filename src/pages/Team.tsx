import React, { useState } from 'react';
import { Mail, User, GraduationCap, Send, MapPin, Phone } from 'lucide-react';
import './Demo.css';
import './Team.css';

interface TeamMember {
  name: string;
  registrationNumber: string;
  email: string;
  photo: string;
}

interface Supervisor {
  name: string;
  title: string;
  email: string;
}

const Team: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const teamMembers: TeamMember[] = [
    {
      name: 'Muhammad Sohaib',
      registrationNumber: '22K-4454',
      email: 'k224454@nu.edu.pk',
      photo: '/api/placeholder/200/200'
    },
    {
      name: 'Tehreem Ali Khan',
      registrationNumber: '22K-8700',
      email: 'k228700@nu.edu.pk',
      photo: '/api/placeholder/200/200'
    },
    {
      name: 'Shahzaib',
      registrationNumber: '19K-0337',
      email: 'k190337@nu.edu.pk',
      photo: '/api/placeholder/200/200'
    }
  ];

  const supervisors: Supervisor[] = [
    {
      name: 'Mr. Minhal Raza',
      title: 'Lecturer',
      email: 'minhal.raza@nu.edu.pk'
    },
    {
      name: 'Dr. Ghufran Ahmed',
      title: 'Professor',
      email: 'ghufran.ahmed@nu.edu.pk'
    },
    {
      name: 'Mr. Usama Antuley',
      title: 'Lecturer',
      email: 'usama.antuley@nu.edu.pk'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - placeholder for now
    console.log('Form submitted:', formData);
    alert('Thank you. Your message has been recorded; the team will respond when possible.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="demo team">
      <section className="section">
        <div className="container">
          <header className="page-heading">
            <h1 className="page-heading__title">Project team</h1>
            <p className="page-heading__lead">
              Final-year CS/AI group responsible for the breast histopathology research prototype and
              accompanying web interface.
            </p>
          </header>
          <div className="demo-content">
            <div className="upload-section">
              <div className="team-grid">
                {teamMembers.map((member, index) => (
                  <div key={index} className="team-card">
                    <div className="member-photo">
                      <img
                        src={member.photo}
                        alt={member.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a5f8a&color=fff&size=200`;
                        }}
                      />
                    </div>
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p className="member-registration">
                        <GraduationCap size={16} />
                        {member.registrationNumber}
                      </p>
                      <a
                        href={`mailto:${member.email}`}
                        className="member-email"
                      >
                        <Mail size={16} />
                        {member.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt team-supervisors" aria-labelledby="supervisors-heading">
        <div className="container">
          <header className="page-heading page-heading--compact team-supervisors__header">
            <h2 id="supervisors-heading" className="page-heading__title">
              Project supervisors
            </h2>
            <p className="page-heading__lead">Faculty advisor for this final-year project.</p>
          </header>
          <div className="demo-content">
            <div className="upload-section">
              <div className="team-grid">
                {supervisors.map((supervisor) => (
                  <div key={supervisor.email} className="team-card">
                    <div className="member-photo member-photo--supervisor" aria-hidden>
                      <User size={44} strokeWidth={1.75} />
                    </div>
                    <div className="member-info">
                      <h3>{supervisor.name}</h3>
                      <p className="member-registration">
                        <User size={16} aria-hidden />
                        {supervisor.title}
                      </p>
                      <a href={`mailto:${supervisor.email}`} className="member-email">
                        <Mail size={16} aria-hidden />
                        {supervisor.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="page-heading page-heading--compact">
            <h2 className="page-heading__title">Project information</h2>
            <p className="page-heading__lead">
              Identifiers and affiliation for reports and documentation.
            </p>
          </header>
          <div className="demo-content">
            <div className="upload-section">
              <div className="project-info-grid">
                <div className="info-card">
                  <h4>Project ID</h4>
                  <p>F25-46</p>
                  <p>Sp-181</p>
                </div>
                <div className="info-card">
                  <h4>Institution</h4>
                  <p>FAST National University</p>
                </div>
                <div className="info-card">
                  <h4>Department</h4>
                  <p>Computer Science & Artificial Intelligence</p>
                </div>
                <div className="info-card">
                  <h4>Domain</h4>
                  <p>Research & Development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="demo-content">
            <div className="upload-section">
              <div className="contact-content">
                <div className="contact-info">
                  <div className="upload-section__intro contact-info__intro">
                    <h2>Contact</h2>
                    <p className="upload-description">
                      For academic or technical questions about this prototype, use the form or the channels
                      listed below.
                    </p>
                  </div>

                  <div className="contact-details">
                    <div className="contact-item">
                      <MapPin size={20} />
                      <div>
                        <h4>Location</h4>
                        <p>FAST National University<br />Karachi Campus, Pakistan</p>
                      </div>
                    </div>

                    <div className="contact-item">
                      <Mail size={20} />
                      <div>
                        <h4>Email</h4>
                        <p>project@fastnu.edu.pk</p>
                      </div>
                    </div>

                    <div className="contact-item">
                      <Phone size={20} />
                      <div>
                        <h4>Phone</h4>
                        <p>+92 21 111 128 128</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="contact-form-container">
                  <form className="contact-form" onSubmit={handleSubmit}>
                    <h3 className="contact-form__title">Message the team</h3>

                    <div className="form-group">
                      <label htmlFor="name">Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Full name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="name@institution.edu"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="message">Message *</label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={5}
                        placeholder="Brief description of your inquiry…"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary submit-btn">
                      <Send size={18} strokeWidth={2} aria-hidden />
                      Submit
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Team;
