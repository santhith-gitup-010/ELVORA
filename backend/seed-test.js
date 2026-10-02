async function seedData() {
    try {
        console.log('Fetching books and students...');
        const booksReq = await fetch('http://localhost:5000/api/books');
        const studentsReq = await fetch('http://localhost:5000/api/students');
        
        const booksData = await booksReq.json();
        const studentsData = await studentsReq.json();

        const books = booksData.data?.books || [];
        const students = studentsData.data?.students || [];

        if (books.length === 0 || students.length === 0) {
            console.log('No books or students found to test with.');
            return;
        }

        const book = books[0]; 
        const student = students[0];

        console.log(`Using Book: ${book.title} (${book.barcode})`);
        console.log(`Using Student: ${student.name} (${student.studentId})`);

        // 1. Issue the book to trigger an Audit Log
        console.log('\n--- 1. Testing Scan (Issue) ---');
        try {
            const res = await fetch('http://localhost:5000/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: book.barcode,
                    studentId: student.studentId,
                    action: 'issue'
                })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            console.log('Book issued successfully -> Audit Log generated!');
        } catch (e) {
            console.log('Issue error:', e.message);
        }

        // 2. Return the book to trigger another Audit Log
        console.log('\n--- 2. Testing Scan (Return) ---');
        try {
            const res = await fetch('http://localhost:5000/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: book.barcode,
                    studentId: student.studentId,
                    action: 'return'
                })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            console.log('Book returned successfully -> Audit Log generated!');
        } catch (e) {
            console.log('Return error:', e.message);
        }

        // 3. Create a Reservation
        console.log('\n--- 3. Testing Reservation ---');
        try {
            // First, issue all copies so we can reserve it
            const currentBookRes = await fetch(`http://localhost:5000/api/books/${book._id}`);
            const currentBookData = await currentBookRes.json();
            const currentBook = currentBookData.data?.book;
            
            for (let i = 0; i < currentBook.availableCount; i++) {
                 await fetch('http://localhost:5000/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: book.barcode,
                        studentId: students[i % students.length].studentId,
                        action: 'issue'
                    })
                });
            }
            
            // Now reserve it
            const res = await fetch(`http://localhost:5000/api/books/${book._id}/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: students[1 % students.length].studentId
                })
            });
            const reserveData = await res.json();
            if(!res.ok) throw new Error(reserveData.message);
            
            console.log('Reservation created successfully -> Audit Log & Reservation Queue populated!');
            console.log(reserveData.message);
        } catch (e) {
            console.log('Reservation error:', e.message);
        }

        console.log('\nTest data successfully seeded! Check the Audit Trail and Reservations pages.');
    } catch (error) {
        console.error('Error seeding test data:', error.message);
    }
}

seedData();
