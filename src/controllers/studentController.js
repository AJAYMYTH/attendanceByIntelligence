const supabase = require('../utils/supabase');
const xlsx = require('xlsx');
const fs = require('fs');

exports.getStudents = async (req, res) => {
    const { section } = req.query;
    try {
        let query = supabase.from('students').select('*');
        if (section) query = query.eq('section', section);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
};

exports.uploadStudents = async (req, res) => {
    const { section } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Format: Students Name, Register Number
        // Normalize column names to handle variations
        const studentsToInsert = data.map(row => {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.trim().toLowerCase()] = row[key];
            });

            const name = normalizedRow['students name'] || normalizedRow['student name'] || normalizedRow['name'] || normalizedRow['student_name'];
            const regNo = normalizedRow['register number'] || normalizedRow['register no'] || normalizedRow['reg no'] || normalizedRow['reg_number'] || normalizedRow['reg_no'];

            return {
                name: name ? name.toString().trim() : 'Unknown',
                register_number: regNo ? regNo.toString().trim() : 'N/A',
                section: section
            };
        });

        const { data: inserted, error } = await supabase
            .from('students')
            .upsert(studentsToInsert, { onConflict: 'register_number' })
            .select();

        if (error) throw error;

        // Cleanup file
        fs.unlinkSync(req.file.path);

        res.json({ message: 'Students uploaded successfully', count: inserted.length, preview: inserted.slice(0, 5) });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error uploading students', error: err.message });
    }
};

exports.addStudentManual = async (req, res) => {
    const { name, register_number, section } = req.body;
    try {
        const { data, error } = await supabase
            .from('students')
            .upsert([{ name, register_number, section }], { onConflict: 'register_number' })
            .select();

        if (error) throw error;
        res.json({ message: 'Student added successfully', data });
    } catch (err) {
        res.status(500).json({ message: 'Error adding student', error: err.message });
    }
};

exports.deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting student', error: err.message });
    }
};

exports.bulkDeleteStudents = async (req, res) => {
    const { ids } = req.body;
    try {
        const { error } = await supabase.from('students').delete().in('id', ids);
        if (error) throw error;
        res.json({ message: 'Students deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error bulk deleting students', error: err.message });
    }
};
