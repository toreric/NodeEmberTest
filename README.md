# NodeEmberTest

Testing new concepts in web programs:
One-page gallery app run in a standard web browser, locally installed or on a web server (example: <http://mishapp.hopto.org/>, swedish)

The main project is the 'TestProject' containing the application core. It may be run primitively only with the Ember development server (useful for debugging), but is wrapped within the 'NodeEmberTest' project ('project' = an apparently 'common' way of file organization).

I have decided not to use the Ember data model in order to try making the system better self-contained and movable. The aim is to make possible to show an unlimited number of albums (photo galleries). 

Each album is a file folder from one (at the moment) or (prepared for) an unlimited number of file directory trees. Each album is suggested to contain a maximum of about a hundred pictures, which is what one may eas-silly keep an overview of on the computer screen.

A main idea is too keep all information such as picture legend etc. as metadata within the picture. Thus the pictures may be squashed around by some means and still be more easily reorganized than if their descriptions have been lost. In spite of this, an embedded database is planned for, where picture information may be collected (maybe on demand) for fast free-text search in such as file names, picture legends, etc.

Please apologize the dull naming; should be, for example, MishCore and Mish in case the application will be named 'Mish' (preliminary proposal).

The TestProject README.md is auto-generated and maybe somewhat misleading(?) before qualified adjustment.

Please mail me for better information / Tore

P.S. See also NOTABLE and TODO
